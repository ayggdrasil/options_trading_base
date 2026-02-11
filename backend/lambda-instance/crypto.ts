import { sign, randomBytes } from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import { createHash } from 'crypto';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  PutSecretValueCommand,
  CreateSecretCommand,
} from '@aws-sdk/client-secrets-manager';

export class CryptoUtil {
  static generateRandomSeed(): string {
    const randomSeed = randomBytes(32);
    return encodeBase64(randomSeed);
  }

  static generateKeyPair(seed?: string): { salt1: string; salt2: string } {
    try {
      const actualSeed = seed || this.generateRandomSeed();
      const seedHash = createHash('sha256').update(actualSeed).digest();
      const keyPair = sign.keyPair.fromSeed(new Uint8Array(seedHash));
      return {
        salt1: encodeBase64(keyPair.secretKey),
        salt2: encodeBase64(keyPair.publicKey),
      };
    } catch (error) {
      console.log('Key generation error:', error);
      throw error;
    }
  }

  static encrypt(text: string, salt1: string): string {
    try {
      const message = new TextEncoder().encode(text);
      const privateKeyUint8 = decodeBase64(salt1);
      const signedMessage = sign(message, privateKeyUint8);
      return encodeBase64(signedMessage);
    } catch (error) {
      console.log('Encryption error:', error);
      throw error;
    }
  }

  static decrypt(encryptedText: string, salt2: string): string {
    try {
      const signedMessage = decodeBase64(encryptedText);
      const publicKeyUint8 = decodeBase64(salt2);
      const decrypted = sign.open(signedMessage, publicKeyUint8);
      if (!decrypted) {
        throw new Error('Decryption failed');
      }
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.log('Decryption error:', error);
      throw error;
    }
  }
}

export class SecretKeyManager {
  client: any;
  DEFAULT_PATH: string;
  readonly SALT_PATH: string;

  constructor({
    region,
    DEFAULT_PATH,
    SALT_PATH = '/common/salt',
  }: {
    region: string;
    DEFAULT_PATH: string;
    SALT_PATH?: string;
  }) {
    this.client = new SecretsManagerClient({ region });
    this.DEFAULT_PATH = DEFAULT_PATH;
    this.SALT_PATH = SALT_PATH;
  }

  async decrypt({ keyName }: any) {
    const salt_response: any = await this.client.send(
      new GetSecretValueCommand({
        SecretId: this.SALT_PATH,
      }),
    );
    const salts = JSON.parse(salt_response.SecretString);

    const secretPath = this.DEFAULT_PATH.endsWith('/')
      ? this.DEFAULT_PATH + keyName
      : this.DEFAULT_PATH + '/' + keyName;

    const response: any = await this.client.send(
      new GetSecretValueCommand({
        SecretId: secretPath,
      }),
    );

    const decrypted = CryptoUtil.decrypt(response.SecretString, salts.SALT2);

    return decrypted;
  }

  async getSalt() {
    const salt_response: any = await this.client.send(
      new GetSecretValueCommand({
        SecretId: this.SALT_PATH,
      }),
    );
    return JSON.parse(salt_response.SecretString);
  }

  async createSalt() {
    const keyPair = CryptoUtil.generateKeyPair();

    const saltData = {
      SALT1: keyPair.salt1,
      SALT2: keyPair.salt2,
    };

    try {
      await this.client.send(
        new CreateSecretCommand({
          Name: this.SALT_PATH,
          SecretString: JSON.stringify(saltData),
          Description: 'Encryption salt for secrets',
        }),
      );
      console.log(`✅ Salt created at ${this.SALT_PATH}`);
      console.log('⚠️  IMPORTANT: Save SALT1 securely - you need it to encrypt secrets!');
      return saltData;
    } catch (error: any) {
      if (error.name === 'ResourceExistsException') {
        console.log(`⚠️  Salt already exists at ${this.SALT_PATH}`);
        return await this.getSalt();
      }
      throw error;
    }
  }

  async encryptAndSave({ keyName, data }: { keyName: string; data: Record<string, string> }) {
    const salt_response: any = await this.client.send(
      new GetSecretValueCommand({
        SecretId: this.SALT_PATH,
      }),
    );

    const salts = JSON.parse(salt_response.SecretString);

    // 데이터를 JSON 문자열로 변환
    const jsonData = JSON.stringify(data);

    // 암호화
    const encrypted = CryptoUtil.encrypt(jsonData, salts.SALT1);

    // Secret 경로
    const secretPath = this.DEFAULT_PATH.endsWith('/')
      ? this.DEFAULT_PATH + keyName
      : this.DEFAULT_PATH + '/' + keyName;

    try {
      // Secret이 이미 존재하는지 확인하고 업데이트
      await this.client.send(
        new PutSecretValueCommand({
          SecretId: secretPath,
          SecretString: encrypted,
        }),
      );
      console.log(`✅ Secret ${secretPath} updated successfully`);
    } catch (error: any) {
      // Secret이 없으면 생성
      if (error.name === 'ResourceNotFoundException') {
        await this.client.send(
          new CreateSecretCommand({
            Name: secretPath,
            SecretString: encrypted,
            Description: `Encrypted secret for ${keyName}`,
          }),
        );
        console.log(`✅ Secret ${secretPath} created successfully`);
      } else {
        throw error;
      }
    }
  }
}
