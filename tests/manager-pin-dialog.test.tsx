// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ManagerPinDialog, {
  INCORRECT_PASSWORD_MESSAGE,
  VERIFICATION_UNAVAILABLE_MESSAGE,
  revealManagerPin,
  type PinRevealOutcome,
} from "@/components/module-pos/ManagerPinDialog";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const passwordField = () => screen.getByLabelText("Account password") as HTMLInputElement;
const submitButton = () => screen.getByRole("button", { name: /Verify and view PIN|Verifying…/ });

function typeAndSubmit(password: string) {
  fireEvent.change(passwordField(), { target: { value: password } });
  fireEvent.click(submitButton());
}

it("asks for the account password first and fetches nothing on open", () => {
  const reveal = vi.fn();
  render(<ManagerPinDialog onClose={() => {}} reveal={reveal} />);

  expect(screen.getByRole("heading", { name: "Confirm your password" })).toBeTruthy();
  expect(screen.getByText("Enter your account password to view your manager PIN.")).toBeTruthy();
  expect(passwordField().type).toBe("password");
  expect(document.activeElement).toBe(passwordField());
  expect(reveal).not.toHaveBeenCalled();
});

it("cannot submit an empty password", () => {
  const reveal = vi.fn();
  render(<ManagerPinDialog onClose={() => {}} reveal={reveal} />);

  expect((submitButton() as HTMLButtonElement).disabled).toBe(true);
  fireEvent.submit(passwordField().form!);
  expect(reveal).not.toHaveBeenCalled();
});

it("shows Verifying… once and reveals the PIN after a correct password", async () => {
  let finish!: (outcome: PinRevealOutcome) => void;
  const reveal = vi.fn(() => new Promise<PinRevealOutcome>((resolve) => { finish = resolve; }));
  render(<ManagerPinDialog onClose={() => {}} reveal={reveal} />);

  typeAndSubmit("secret");
  expect(submitButton().textContent).toBe("Verifying…");
  fireEvent.submit(passwordField().form!);
  expect(reveal).toHaveBeenCalledOnce();

  await act(async () => finish({ ok: true, pinCode: "482913" }));
  expect(screen.getByRole("heading", { name: "Manager PIN" })).toBeTruthy();
  expect(screen.getByText("482913")).toBeTruthy();
});

it("keeps the PIN hidden, clears the field and lets the manager retry after a wrong password", async () => {
  const reveal = vi.fn(async (): Promise<PinRevealOutcome> => ({ ok: false, message: INCORRECT_PASSWORD_MESSAGE }));
  render(<ManagerPinDialog onClose={() => {}} reveal={reveal} />);

  typeAndSubmit("wrong");
  await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(INCORRECT_PASSWORD_MESSAGE));
  expect(passwordField().value).toBe("");
  expect(screen.queryByRole("heading", { name: "Manager PIN" })).toBeNull();

  typeAndSubmit("again");
  await waitFor(() => expect(reveal).toHaveBeenCalledTimes(2));
});

it("never shows a PIN that arrives after the dialog was cancelled", async () => {
  let finish!: (outcome: PinRevealOutcome) => void;
  let signal!: AbortSignal;
  const reveal = vi.fn((_password: string, s: AbortSignal) => {
    signal = s;
    return new Promise<PinRevealOutcome>((resolve) => { finish = resolve; });
  });
  const onClose = vi.fn();
  render(<ManagerPinDialog onClose={onClose} reveal={reveal} />);

  typeAndSubmit("secret");
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onClose).toHaveBeenCalledOnce();
  expect(signal.aborted).toBe(true);

  await act(async () => finish({ ok: true, pinCode: "482913" }));
  expect(screen.queryByText("482913")).toBeNull();
});

it("requires a fresh password each time it opens", async () => {
  const reveal = vi.fn(async (): Promise<PinRevealOutcome> => ({ ok: true, pinCode: "482913" }));
  const { unmount } = render(<ManagerPinDialog onClose={() => {}} reveal={reveal} />);
  typeAndSubmit("secret");
  await waitFor(() => expect(screen.getByText("482913")).toBeTruthy());
  unmount();

  render(<ManagerPinDialog onClose={() => {}} reveal={reveal} />);
  expect(screen.getByRole("heading", { name: "Confirm your password" })).toBeTruthy();
  expect(passwordField().value).toBe("");
  expect(screen.queryByText("482913")).toBeNull();
});

it("posts the password in the body only and maps server answers", async () => {
  const respond = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(respond(200, { pinCode: "482913" }))
    .mockResolvedValueOnce(respond(422, { message: "anything" }))
    .mockResolvedValueOnce(respond(503, { message: "upstream detail" }))
    .mockRejectedValueOnce(new TypeError("network"));
  vi.stubGlobal("fetch", fetchMock);
  const signal = new AbortController().signal;

  expect(await revealManagerPin("secret", signal)).toEqual({ ok: true, pinCode: "482913" });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/pos/user-pin");
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body)).toEqual({ password: "secret" });
  expect(await revealManagerPin("wrong", signal)).toEqual({ ok: false, message: INCORRECT_PASSWORD_MESSAGE });
  expect(await revealManagerPin("secret", signal)).toEqual({ ok: false, message: VERIFICATION_UNAVAILABLE_MESSAGE });
  expect(await revealManagerPin("secret", signal)).toEqual({ ok: false, message: VERIFICATION_UNAVAILABLE_MESSAGE });
});
