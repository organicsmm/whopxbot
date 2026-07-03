import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getWallet from "./tools/get-wallet";
import listOrders from "./tools/list-orders";
import listEngagementOrders from "./tools/list-engagement-orders";
import listInstagramAccounts from "./tools/list-instagram-accounts";
import searchServices from "./tools/search-services";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "organic-smm-pro-mcp",
  title: "Organic SMM Pro",
  version: "0.1.0",
  instructions:
    "Tools for Organic SMM Pro. Read the signed-in user's wallet balance, SMM orders, engagement orders, linked Instagram accounts, and search available services.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getWallet, listOrders, listEngagementOrders, listInstagramAccounts, searchServices],
});
