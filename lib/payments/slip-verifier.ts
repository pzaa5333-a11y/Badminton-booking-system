/**
 * Slip verification behind an interface so local dev (and this whole
 * project, until real credentials exist — see Milestone 9) can run against
 * a stub with no external API calls or keys. SLIP_VERIFIER selects the
 * implementation; only "stub" is wired up so far.
 */
export interface SlipVerificationResult {
  verified: boolean;
  provider: "stub" | "slipok";
  raw?: unknown;
}

export interface SlipVerifier {
  verify(input: { imagePath: string; expectedAmount: number }): Promise<SlipVerificationResult>;
}

class StubSlipVerifier implements SlipVerifier {
  async verify(): Promise<SlipVerificationResult> {
    return { verified: true, provider: "stub" };
  }
}

export function getSlipVerifier(): SlipVerifier {
  return new StubSlipVerifier();
}
