export type PosProxyMethod = "GET" | "POST" | "PUT";

// Only these api-pos endpoints are reachable through the browser proxy (/api/pos/...).
const PROOF_READ = /^order-management\/orders\/\d+\/(delivery-proof|refund-proof)$/;
const ORDER_ACTION =
  /^order-management\/orders\/\d+\/(approve-void|reject-void|request-void|approve-refund|reject-refund|request-refund|complete-payment|confirm-institutional-delivery|status)$/;
// Proof photo uploads: request a signed upload address, then confirm it. Photo bytes never pass here.
const PROOF_UPLOAD = /^order-management\/orders\/\d+\/proof-uploads\/(delivery|refund)(\/confirm)?$/;
// The staff bell: read the feed and count, mark one or all read, and get a live-updates ticket.
const BELL_READ = /^notifications(\/unread-count)?$/;
const BELL_ACTION = /^notifications\/(\d{1,18}\/read|read-all|live-ticket)$/;

export function isAllowedPosEndpoint(method: PosProxyMethod, endpoint: string): boolean {
  switch (method) {
    case "GET":
      return endpoint === "user-pin" || PROOF_READ.test(endpoint) || BELL_READ.test(endpoint);
    case "PUT":
      return ORDER_ACTION.test(endpoint);
    case "POST":
      return PROOF_UPLOAD.test(endpoint) || BELL_ACTION.test(endpoint);
  }
}
