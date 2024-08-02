export interface GenericStatus {
  code: number;
  message?: string;
}

export interface Status extends GenericStatus {
  message: string;
}
