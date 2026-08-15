import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  SearchX,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { claimCryptoOrderTransfer, reconcileCryptoOrder } from "../api";

const EXPLORERS = {
  tron: "https://tronscan.org/#/transaction/",
  eth: "https://etherscan.io/tx/",
  bsc: "https://bscscan.com/tx/",
};

function shorten(value, head = 10, tail = 8) {
  const text = String(value || "");
  if (text.length <= head + tail + 3) return text;
  return `${text.slice(0, head)}...${text.slice(-tail)}`;
}

function formatCountdown(seconds) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export default function CryptoTopupReconcileModal({
  record,
  onClose,
  onSuccess,
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [claimingHash, setClaimingHash] = useState("");
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const successNotified = useRef(false);

  const applyResult = useCallback(
    async (data) => {
      setResult(data || null);
      const expiresAt = Number(data?.claim?.expires_at || 0);
      setTimeLeft(Math.max(0, expiresAt - Math.floor(Date.now() / 1000)));
      if (data?.phase === "success" && !successNotified.current) {
        successNotified.current = true;
        toast.success(t("topup.reconcileSuccess"));
        await onSuccess?.();
      }
    },
    [onSuccess, t],
  );

  const reconcile = useCallback(async () => {
    if (!record?.trade_no) return;
    setLoading(true);
    try {
      const response = await reconcileCryptoOrder(record.trade_no);
      if (response.data?.message !== "success" && !response.data?.success) {
        toast.error(
          response.data?.data ||
            response.data?.message ||
            t("topup.reconcileQueryFailed"),
        );
        return;
      }
      await applyResult(response.data.data);
    } catch {
      toast.error(t("topup.reconcileQueryFailed"));
    } finally {
      setLoading(false);
    }
  }, [applyResult, record?.trade_no, t]);

  useEffect(() => {
    if (!record?.trade_no) return;
    successNotified.current = false;
    setResult(null);
    reconcile();
    // Parent balance/history refreshes replace callbacks; only a new order
    // should restart the initial on-chain lookup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record?.trade_no]);

  useEffect(() => {
    if (result?.phase !== "challenge") return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [result?.phase]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const startClaim = async (txHash) => {
    setClaimingHash(txHash);
    try {
      const response = await claimCryptoOrderTransfer(record.trade_no, txHash);
      if (response.data?.message !== "success" && !response.data?.success) {
        toast.error(
          response.data?.data ||
            response.data?.message ||
            t("topup.claimCreateFailed"),
        );
        return;
      }
      await applyResult(response.data.data);
    } catch {
      toast.error(t("topup.claimCreateFailed"));
    } finally {
      setClaimingHash("");
    }
  };

  const copyText = async (value) => {
    try {
      await navigator.clipboard.writeText(String(value || ""));
      toast.success(t("topup.copied"));
    } catch {
      toast.error(t("topup.copyFailed"));
    }
  };

  if (!record) return null;

  const chain = String(
    result?.claim?.chain || result?.crypto_chain || record.crypto_chain || "",
  ).toLowerCase();
  const token = String(
    result?.claim?.token || result?.crypto_token || record.crypto_token || "",
  ).toUpperCase();
  const candidates = Array.isArray(result?.candidates) ? result.candidates : [];
  const explorerBase = EXPLORERS[chain];

  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="crypto-reconcile-title"
        className="glass max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-2xl p-5 sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="crypto-reconcile-title"
              className="flex items-center gap-2 text-lg font-semibold text-page"
            >
              <WalletCards size={19} />
              {t("topup.cryptoReconcile")}
            </h2>
            <p className="mt-1 break-all font-mono text-xs text-page-muted">
              {record.trade_no}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-page-muted transition-colors hover:bg-page-surface-hover hover:text-page"
            title={t("topup.close")}
          >
            <X size={18} />
          </button>
        </div>

        {loading && !result ? (
          <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-sm text-page-secondary">
            <Loader2 className="animate-spin text-brand-500" size={26} />
            {t("topup.reconcileChecking")}
          </div>
        ) : result?.phase === "success" ? (
          <div className="flex min-h-52 flex-col items-center justify-center text-center">
            <CheckCircle2 className="mb-3 text-page-success" size={44} />
            <h3 className="text-base font-semibold text-page">
              {t("topup.reconcileSuccessTitle")}
            </h3>
            <p className="mt-1 text-sm text-page-secondary">
              {t("topup.reconcileCredited")}
            </p>
          </div>
        ) : result?.phase === "challenge" ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-green-500/30 bg-green-500/5 p-3">
              <ShieldCheck
                className="mt-0.5 shrink-0 text-page-success"
                size={20}
              />
              <div>
                <h3 className="text-sm font-semibold text-page">
                  {t("topup.verifyOriginalWallet")}
                </h3>
                <p className="mt-1 text-xs leading-5 text-page-secondary">
                  {t("topup.verifyOriginalWalletHint")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="glass-sm rounded-xl p-3">
                <p className="text-xs text-page-secondary">
                  {t("topup.verificationAmount")}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <strong className="min-w-0 break-all font-mono text-lg text-page-warning">
                    {result.claim.challenge_amount} {token}
                  </strong>
                  <button
                    type="button"
                    onClick={() => copyText(result.claim.challenge_amount)}
                    className="shrink-0 rounded-lg p-2 text-page-muted transition-colors hover:bg-page-surface-hover hover:text-page"
                    title={t("topup.copyVerificationAmount")}
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              <div className="glass-sm rounded-xl p-3">
                <p className="text-xs text-page-secondary">
                  {t("topup.verificationTimeLeft")}
                </p>
                <div className="mt-1 flex items-center gap-2 text-lg font-semibold text-page">
                  <Clock3 className="text-page-warning" size={17} />
                  {formatCountdown(timeLeft)}
                </div>
              </div>
            </div>

            <div className="glass-sm rounded-xl p-3">
              <p className="text-xs text-page-secondary">
                {t("topup.walletAddress")} · {chain.toUpperCase()}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all text-sm text-page">
                  {result.claim.wallet}
                </code>
                <button
                  type="button"
                  onClick={() => copyText(result.claim.wallet)}
                  className="shrink-0 rounded-lg p-2 text-page-muted transition-colors hover:bg-page-surface-hover hover:text-page"
                  title={t("topup.copyWalletAddress")}
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <p className="text-xs leading-5 text-page-secondary">
              {t("topup.originalSendingWallet")}:{" "}
              <span className="font-mono text-page">
                {shorten(result.claim.from_address, 12, 10)}
              </span>
              <br />
              {t("topup.verificationNotCredited")}
            </p>

            <button
              type="button"
              disabled={loading}
              onClick={reconcile}
              className="btn-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <RefreshCw size={16} />
              )}
              {timeLeft > 0
                ? t("topup.verifyNow")
                : t("topup.verificationExpired")}
            </button>
          </div>
        ) : result?.phase === "candidates" ? (
          <div>
            <h3 className="text-sm font-semibold text-page">
              {t("topup.selectMissingTransfer")}
            </h3>
            <p className="mt-1 text-xs leading-5 text-page-secondary">
              {t("topup.selectMissingTransferHint")}
            </p>
            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
              {candidates.map((candidate) => (
                <div
                  key={candidate.tx_hash}
                  className="glass-sm rounded-xl p-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-all font-mono text-sm font-semibold text-page">
                        {candidate.amount} {token}
                      </p>
                      <p className="mt-1 text-xs text-page-secondary">
                        {new Date(candidate.timestamp * 1000).toLocaleString()}{" "}
                        · {shorten(candidate.from_address)}
                      </p>
                      <div className="mt-1 flex min-w-0 items-center gap-1 text-xs text-page-muted">
                        <span className="min-w-0 truncate font-mono">
                          {shorten(candidate.tx_hash, 12, 10)}
                        </span>
                        {explorerBase && (
                          <a
                            href={`${explorerBase}${candidate.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-brand-500 hover:text-brand-400"
                            title={t("topup.viewOnExplorer")}
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(claimingHash)}
                      onClick={() => startClaim(candidate.tx_hash)}
                      className="btn-primary flex shrink-0 items-center justify-center gap-2 px-4 py-2 disabled:opacity-50"
                    >
                      {claimingHash === candidate.tx_hash && (
                        <Loader2 className="animate-spin" size={15} />
                      )}
                      {t("topup.claimTransfer")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex min-h-52 flex-col items-center justify-center px-3 text-center">
            <SearchX className="mb-3 text-page-muted" size={40} />
            <h3 className="text-sm font-semibold text-page">
              {t("topup.noClaimableTransfer")}
            </h3>
            <p className="mt-1 max-w-md text-xs leading-5 text-page-secondary">
              {t("topup.noClaimableTransferHint")}
            </p>
          </div>
        )}

        {result?.phase !== "success" && result?.phase !== "challenge" && (
          <button
            type="button"
            disabled={loading}
            onClick={reconcile}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-page-divider px-4 py-2.5 text-sm font-medium text-page transition-colors hover:bg-page-surface-hover disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <RefreshCw size={16} />
            )}
            {t("topup.checkAgain")}
          </button>
        )}
      </div>
    </div>
  );
}
