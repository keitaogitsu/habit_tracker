const mockAxios: {
  create: jest.Mock;
  get: jest.Mock;
  post: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
  isAxiosError: (value: unknown) => value is { isAxiosError: true };
} = {
  create: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  isAxiosError: (value: unknown): value is { isAxiosError: true } =>
    Boolean((value as { isAxiosError?: boolean })?.isAxiosError),
};

mockAxios.create.mockReturnValue(mockAxios);

export default mockAxios;
