import AsyncStorage from '@react-native-async-storage/async-storage';
import { txoddsService } from './txodds';

const STORAGE_JWT = 'txodds_jwt';
const STORAGE_API_TOKEN = 'txodds_api_token';
const STORAGE_ACTIVATED = 'txodds_activated';

export type AuthStep =
  | 'idle'
  | 'getting_jwt'
  | 'subscribing'
  | 'error';

export interface AuthState {
  step: AuthStep;
  error: string | null;
}

type AuthCallback = (state: AuthState) => void;

class TxoddsAuthService {
  private listener: AuthCallback | null = null;
  private _jwt: string | null = null;
  private _apiToken: string | null = null;

  onStateChange(cb: AuthCallback) {
    this.listener = cb;
  }

  private emit(state: AuthStep, error?: string) {
    this.listener?.({ step: state, error: error ?? null });
  }

  /** Check AsyncStorage for existing credentials and configure the service. */
  async restore(): Promise<boolean> {
    try {
      const jwt = await AsyncStorage.getItem(STORAGE_JWT);
      const apiToken = await AsyncStorage.getItem(STORAGE_API_TOKEN);
      const activated = await AsyncStorage.getItem(STORAGE_ACTIVATED);

      if (jwt && apiToken && activated === 'true') {
        this._jwt = jwt;
        this._apiToken = apiToken;
        txoddsService.configure(jwt, apiToken, false);
        this.emit('error'); // will be ignored, already done
        return true;
      }
    } catch {
      // Storage unavailable
    }
    return false;
  }

  /** Attempt to get a guest JWT. If it works, we proceed to manual setup. */
  async tryGetJwt(): Promise<void> {
    this.emit('getting_jwt');
    try {
      const { default: axios } = await import('axios');
      const res = await axios.post('https://txline.txodds.com/auth/guest/start');
      const jwt: string = res.data.token;
      this._jwt = jwt;
      await AsyncStorage.setItem(STORAGE_JWT, jwt);

      // JWT obtained — now show the manual setup screen
      // (on-chain subscription + activation must be done via the CLI script)
      this.emit('error',
        'JWT obtained. To complete setup, run this in your terminal:\n\n' +
        '  node scripts/activate-txodds.mjs\n\n' +
        'Then restart the app. Or paste your credentials below.'
      );
    } catch (err: any) {
      this.emit('error', err?.message || 'Failed to get API access');
    }
  }

  /** Save manually entered credentials. */
  async saveManual(jwt: string, apiToken: string): Promise<void> {
    this._jwt = jwt;
    this._apiToken = apiToken;
    await AsyncStorage.setItem(STORAGE_JWT, jwt);
    await AsyncStorage.setItem(STORAGE_API_TOKEN, apiToken);
    await AsyncStorage.setItem(STORAGE_ACTIVATED, 'true');
    txoddsService.configure(jwt, apiToken, false);
  }

  /** Clear stored credentials. */
  async clear() {
    this._jwt = null;
    this._apiToken = null;
    await AsyncStorage.multiRemove([
      STORAGE_JWT,
      STORAGE_API_TOKEN,
      STORAGE_ACTIVATED,
    ]);
  }
}

export const txoddsAuth = new TxoddsAuthService();
