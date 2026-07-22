export interface RuntimeDataSource<TConfig, TRules> {
  loadConfig(): Promise<TConfig | null>
  loadRules(): Promise<TRules | null>
}

export interface AnalyticsSink<TEvent, TContext> {
  emit(event: TEvent, context: TContext): Promise<void>
}

export interface VersionedDataRepository<
  TKind extends string,
  TReadOptions,
  TWriteInput,
  TDocument,
  TWriteResult,
> {
  read(kind: TKind, options: TReadOptions): Promise<TDocument>
  write(kind: TKind, input: TWriteInput): Promise<TWriteResult>
}

export interface RuntimePlatformAdapter<TArguments extends readonly unknown[]> {
  readonly id: string
  handle(...args: TArguments): Promise<Response>
}
