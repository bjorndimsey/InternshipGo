declare module 'expo-file-system' {
  export const documentDirectory: string;
  export function downloadAsync(uri: string, fileUri: string, options?: any): Promise<{ status: number; uri: string }>;
  export function getInfoAsync(uri: string): Promise<{ exists: boolean; size: number; isDirectory: boolean; uri: string }>;
}

declare module 'expo-sharing' {
  export function isAvailableAsync(): Promise<boolean>;
  export function shareAsync(uri: string, options?: { mimeType?: string; dialogTitle?: string; UTI?: string }): Promise<void>;
}

declare module 'expo-media-library' {
  export function requestPermissionsAsync(): Promise<{ status: string }>;
  export function createAssetAsync(uri: string): Promise<any>;
  export function createAlbumAsync(albumName: string, asset: any, copyAsset?: boolean): Promise<any>;
}
