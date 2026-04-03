import { requestJson } from "./client";
import { persistAuthSession, readAuthSession } from "./auth-storage";
import { ensureAuthRedirect, tryRefreshAccessToken } from "./auth";
import { ApiError } from "./errors";

jest.mock("./auth", () => ({
  tryRefreshAccessToken: jest.fn(),
  ensureAuthRedirect: jest.fn(),
}));

const mockedTryRefreshAccessToken = tryRefreshAccessToken as jest.MockedFunction<typeof tryRefreshAccessToken>;
const mockedEnsureAuthRedirect = ensureAuthRedirect as jest.MockedFunction<typeof ensureAuthRedirect>;

const jsonResponse = (status: number, body: unknown) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response);

describe("requestJson", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    sessionStorage.clear();
    mockedTryRefreshAccessToken.mockReset();
    mockedEnsureAuthRedirect.mockReset();
  });

  it("retries once after 401 when silent renew succeeds", async () => {
    jest
      .spyOn(global, "fetch")
      .mockImplementationOnce(() => jsonResponse(401, { code: "unauthorized", message: "Unauthorized" }))
      .mockImplementationOnce(() => jsonResponse(200, { ok: true }));
    mockedTryRefreshAccessToken.mockResolvedValue(true);

    const result = await requestJson<{ ok: boolean }>("/api/ping");

    expect(result.ok).toBe(true);
    expect(mockedTryRefreshAccessToken).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("clears auth session and throws when 401 retry cannot refresh token", async () => {
    jest
      .spyOn(global, "fetch")
      .mockImplementationOnce(() => jsonResponse(401, { code: "unauthorized", message: "Unauthorized" }));
    mockedTryRefreshAccessToken.mockResolvedValue(false);
    persistAuthSession({
      accessToken: "token",
      expiresAtEpochSeconds: Math.floor(Date.now() / 1000) + 3600,
    });

    await expect(requestJson("/api/ping")).rejects.toBeInstanceOf(ApiError);
    expect(mockedTryRefreshAccessToken).toHaveBeenCalledTimes(1);
    expect(mockedEnsureAuthRedirect).toHaveBeenCalledTimes(1);
    expect(readAuthSession()).toBeNull();
  });
});
