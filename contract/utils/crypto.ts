import { sign, randomBytes } from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';
import { createHash } from 'crypto';
import { SecretsManagerClient, GetSecretValueCommand, PutSecretValueCommand, CreateSecretCommand } from "@aws-sdk/client-secrets-manager";

class CryptoUtil {
    static generateRandomSeed(): string {
      const randomSeed = randomBytes(32);
      return encodeBase64(randomSeed)
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
        console.error('Key generation error:', error);
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
        console.error('Encryption error:', error);
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
        console.error('Decryption error:', error);
        throw error;
      }
    }
  }

export class SecretKeyManager {
  client: any
  DEFAULT_PATH: string

  constructor({ region, DEFAULT_PATH }: any) {
    this.client = new SecretsManagerClient({ region })
    this.DEFAULT_PATH = DEFAULT_PATH
  }

  async decrypt({ keyName }: any) {

    const SALT_PATH = this.DEFAULT_PATH + 'salt'

    const salt_response: any = await this.client.send(new GetSecretValueCommand({
        SecretId: SALT_PATH,
    }));

    const salts = JSON.parse(salt_response.SecretString)

    const secretPath = this.DEFAULT_PATH + keyName

    const response: any = await this.client.send(new GetSecretValueCommand({
        SecretId: secretPath,
    }));

    const decrypted = CryptoUtil.decrypt(response.SecretString, salts.SALT2)

    return decrypted
  }
}