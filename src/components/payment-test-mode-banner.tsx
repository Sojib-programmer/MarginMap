export function PaymentTestModeBanner() {
  const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"];
  if (!clientToken) {
    return (
      <div className="w-full border border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
        Live checkout is not configured. Complete payment go-live before accepting customers.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border border-caution/40 bg-caution/10 px-4 py-2 text-center text-xs text-caution">
        Preview payments are tests. No real money will be charged.
      </div>
    );
  }
  return null;
}