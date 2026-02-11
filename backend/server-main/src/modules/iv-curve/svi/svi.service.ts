import { Logger } from '@nestjs/common';
import { IvByOption, SviDataByExpiry } from '../iv-curve.interface';
import { std } from 'mathjs';
import { join } from 'path';
import { PythonShell } from 'python-shell';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class SviService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger(SviService.name);
  private pyshell: PythonShell | null = null;
  private isReady = false;

  private requestQueue: Array<{
    data: any;
    resolve: (result: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor() {}

  async onModuleInit() {
    await this.initializePythonService();
  }

  async onModuleDestroy() {
    await this.terminatePythonService();
  }

  private async initializePythonService() {
    try {
      const options = {
        mode: 'json' as const,
        pythonPath: join(process.cwd(), 'venv/bin/python3'),
        pythonOptions: ['-u'],
        scriptPath: join(process.cwd(), 'src/modules/iv-curve/utils/python'),
        args: [],
      };

      this.pyshell = new PythonShell('server.py', options);

      this.pyshell.on('message', (message) => {
        const response = message as any;

        if (response.type === 'ready') {
          this.isReady = true;
          return this.processQueue();
        }

        if (this.requestQueue.length < 1) return;

        if (response.type === 'result') {
          const request = this.requestQueue.shift();
          if (request) {
            request.resolve(response.data as IvByOption);
          }
        } else if (response.type === 'error') {
          this.logger.error(`Request failed: ${response.error}`);
          const request = this.requestQueue.shift();
          if (request) {
            request.reject({} as IvByOption);
          }
        }
      });

      this.pyshell.on('error', (err) => {
        this.logger.error(`Python service error: ${err.message}`);
        this.restartPythonService();
      });

      this.pyshell.on('close', () => {
        this.logger.warn('Python service closed unexpectedly');
        this.restartPythonService();
      });
    } catch (error) {
      this.logger.error(`Failed to initialize Python service: ${error.message}`);
      throw error;
    }
  }

  private async terminatePythonService() {
    if (this.pyshell) {
      return new Promise<void>((resolve) => {
        this.pyshell!.end((err) => {
          if (err) {
            this.logger.error(`Error terminating Python service: ${err.message}`);
          }
          this.pyshell = null;
          this.isReady = false;
          resolve();
        });
      });
    }
  }

  private async restartPythonService() {
    this.logger.warn('Restarting Python service');
    this.isReady = false;
    await this.terminatePythonService();
    await this.initializePythonService();
  }

  private processQueue() {
    if (!this.isReady || this.requestQueue.length === 0 || !this.pyshell) return;

    const request = this.requestQueue[0]; // Don't remove yet, wait for response
    try {
      this.pyshell.send({
        type: 'request',
        id: Date.now().toString(),
        data: request.data,
      });
    } catch (error) {
      this.logger.error(`Failed to send request: ${error.message}`);
      const failedRequest = this.requestQueue.shift();
      if (failedRequest) {
        failedRequest.reject({} as IvByOption);
      }
      this.processQueue(); // Try next request
    }
  }

  public async generateIvs(
    sviDataByExpiry: SviDataByExpiry,
    missingInstruments: string[],
    applyMaxSvi: boolean,
  ): Promise<IvByOption> {
    if (!this.pyshell) {
      await this.initializePythonService();
    }

    const inputData = {
      sviDataByExpiry,
      missingInstruments,
      applyMaxSvi,
    };

    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        data: inputData,
        resolve,
        reject,
      });

      this.processQueue();
    });
  }
}
