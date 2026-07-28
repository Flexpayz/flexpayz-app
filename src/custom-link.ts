export type CustomLinkIssue =
    | "empty"
    | "missing-hostname"
    | "credentials"
    | "unsupported-protocol"
    | "invalid";

export type CustomLinkParseResult = {
    rawValue: string;
    normalizedUrl: string | null;
    protocol: "https:" | "http:" | null;
    hostname: string | null;
    displayHostname: string | null;
    path: string | null;
    isValid: boolean;
    isSecure: boolean;
    protocolAdded: boolean;
    issue?: CustomLinkIssue;
};

const WEB_PROTOCOLS = new Set(["https:", "http:"]);

export function parseCustomLink(value: unknown): CustomLinkParseResult {
    const rawValue = typeof value === "string" ? value : "";
    const trimmed = rawValue.trim();

    if (!trimmed) {
        return baseResult(rawValue, "empty");
    }

    const protocolAdded = !/^[a-z][a-z\d+.-]*:/i.test(trimmed);
    const candidate = trimmed.startsWith("//")
        ? `https:${trimmed}`
        : protocolAdded
            ? `https://${trimmed}`
            : trimmed;

    let parsed: URL;
    try {
        parsed = new URL(candidate);
    } catch {
        return baseResult(rawValue, "invalid");
    }

    const protocol = parsed.protocol.toLowerCase();
    if (!WEB_PROTOCOLS.has(protocol)) {
        return baseResult(rawValue, "unsupported-protocol");
    }

    if (parsed.username || parsed.password) {
        return baseResult(rawValue, "credentials");
    }

    if (!parsed.hostname || /\s/.test(parsed.hostname)) {
        return baseResult(rawValue, "missing-hostname");
    }

    const normalizedUrl = buildCanonicalUrl(parsed);
    const path = buildSafePath(parsed);

    return {
        rawValue,
        normalizedUrl,
        protocol: protocol as "https:" | "http:",
        hostname: parsed.hostname,
        displayHostname: parsed.hostname.replace(/^www\./i, ""),
        path,
        isValid: true,
        isSecure: protocol === "https:",
        protocolAdded: trimmed.startsWith("//") || protocolAdded,
    };
}

export function buildCustomLinkUpdate(value: unknown) {
    const parsed = parseCustomLink(value);
    if (!parsed.isValid || !parsed.normalizedUrl) {
        throw new Error(parsed.issue || "invalid");
    }

    return {customLink: parsed.normalizedUrl};
}

export function getCustomLinkDisplayLabel(result: CustomLinkParseResult) {
    return result.displayHostname || "External destination";
}

function baseResult(rawValue: string, issue: CustomLinkIssue): CustomLinkParseResult {
    return {
        rawValue,
        normalizedUrl: null,
        protocol: null,
        hostname: null,
        displayHostname: null,
        path: null,
        isValid: false,
        isSecure: false,
        protocolAdded: false,
        issue,
    };
}

function buildCanonicalUrl(url: URL) {
    const protocol = url.protocol.toLowerCase();
    const hostname = url.hostname.toLowerCase();
    const port = url.port ? `:${url.port}` : "";
    return `${protocol}//${hostname}${port}${url.pathname === "/" ? "" : url.pathname}${url.search}${url.hash}`;
}

function buildSafePath(url: URL) {
    const path = `${url.pathname === "/" ? "" : url.pathname}${url.search ? "?…" : ""}${url.hash ? "#…" : ""}`;
    return path || "/";
}
