export {};

declare global {
  interface IdealabConfig {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
  }

  interface UploadSpec {
    accept: string[];
    maxMB: number;
    maxDim?: number;
    label: string;
  }

  interface Window {
    IDEALAB_ENV: 'local' | 'production';
    IDEALAB_CONFIG: IdealabConfig;
    IDEALAB_BUILD: string;
    IDEALAB_UPLOADS: Record<string, UploadSpec>;
    idealabClient(): SupabaseClientLike | null;
    idealabAcademicYear(): number;
    idealabCheckFile(file: File | null | undefined, spec: UploadSpec): string | null;
    idealabOptimizeImage(
      file: Blob,
      maxDim: number,
      opts?: { quality?: number; square?: boolean },
    ): Promise<Blob>;
    idealabThumbUrl(url: string): string;
    idealabEsc(s: unknown): string;
    idealabSafeUrl(u: unknown): string;
    idealabErrorPage(heading: string, detail: string): void;
    supabase?: {
      createClient(url: string, key: string): SupabaseClientLike;
    };
  }

  /** Minimal shape we use from supabase-js (the lib is vendored, not an npm dep). */
  interface SupabaseClientLike {
    from(table: string): any;
    storage: { from(bucket: string): any };
    auth: any;
    rpc(fn: string, args?: Record<string, unknown>): Promise<{ data: any; error: any }>;
    functions: any;
  }
}
