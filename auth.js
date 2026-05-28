// Dependencies
const Fs = require("fs");
const Path = require("path");
const { execSync, spawnSync } = require("child_process");
const Logger = require("bug-killer");
const ReadlineSync = require("readline-sync");

// Logger configuration
Logger.config.progress = {
    color: "#3498db",
    text: "   > "
};

const configPath = Path.join(__dirname, "config.json");
const defaultConfigPath = Path.join(__dirname, "config.tmpl.json");

/**
 * checkGhCli
 * Verify if GitHub CLI is installed and accessible
 *
 * @name checkGhCli
 * @function
 * @return {Boolean}
 */
function checkGhCli() {
    try {
        execSync("gh --version", { stdio: "ignore" });
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * checkGit
 * Verify if git is installed and accessible
 *
 * @name checkGit
 * @function
 * @return {Boolean}
 */
function checkGit() {
    try {
        execSync("git --version", { stdio: "ignore" });
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * getGitHubTokenFromGhCli
 * Get GitHub token using GitHub CLI
 *
 * @name getGitHubTokenFromGhCli
 * @function
 * @return {String|null}
 */
function getGitHubTokenFromGhCli() {
    try {
        const result = spawnSync("gh", ["auth", "token"], {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"]
        });

        if (result.status === 0 && result.stdout) {
            const token = result.stdout.trim();
            if (token) {
                return token;
            }
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * getGitHubUserFromGhCli
 * Get GitHub username from GitHub CLI
 *
 * @name getGitHubUserFromGhCli
 * @function
 * @return {String|null}
 */
function getGitHubUserFromGhCli() {
    try {
        const result = spawnSync("gh", ["api", "user", "-q", ".login"], {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"]
        });

        if (result.status === 0 && result.stdout) {
            return result.stdout.trim();
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * getGitUserEmail
 * Get user email from git global config
 *
 * @name getGitUserEmail
 * @function
 * @return {String|null}
 */
function getGitUserEmail() {
    try {
        const result = spawnSync("git", ["config", "--global", "user.email"], {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"]
        });

        if (result.status === 0 && result.stdout) {
            return result.stdout.trim();
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * getGitUserName
 * Get user name from git global config
 *
 * @name getGitUserName
 * @function
 * @return {String|null}
 */
function getGitUserName() {
    try {
        const result = spawnSync("git", ["config", "--global", "user.name"], {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"]
        });

        if (result.status === 0 && result.stdout) {
            return result.stdout.trim();
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * getGitHubToken
 * Get GitHub token with multiple fallback options:
 * 1. Try GitHub CLI (gh auth token)
 * 2. Fallback to manual Personal Access Token entry
 *
 * @name getGitHubToken
 * @function
 * @return {String}
 */
function getGitHubToken() {
    Logger.log("Setting up GitHub authentication...", "info");
    Logger.log("", "info");

    // Method 1: Try GitHub CLI
    if (checkGhCli()) {
        Logger.log("✓ GitHub CLI detected", "info");
        const token = getGitHubTokenFromGhCli();
        if (token) {
            const user = getGitHubUserFromGhCli();
            Logger.log("✓ Retrieved token for user: " + (user || "unknown"), "info");
            Logger.log("", "info");
            return token;
        } else {
            Logger.log("⚠ GitHub CLI is installed but not authenticated", "warn");
            Logger.log("  Run: gh auth login", "info");
            Logger.log("", "info");
        }
    } else {
        Logger.log("ℹ GitHub CLI not found (optional)", "info");
        Logger.log("  Install from: https://cli.github.com/", "info");
        Logger.log("  Or provide a Personal Access Token below", "info");
        Logger.log("", "info");
    }

    // Method 2: Fallback to manual Personal Access Token
    Logger.log("Creating a Personal Access Token:", "info");
    Logger.log("  1. Visit: https://github.com/settings/tokens", "info");
    Logger.log("  2. Click 'Generate new token (classic)'", "info");
    Logger.log("  3. Select scopes: repo, read:org, gist", "info");
    Logger.log("", "info");

    const token = ReadlineSync.question("Enter your GitHub Personal Access Token: ", {
        hideEchoBack: true,
        mask: "*"
    });

    if (!token || token.trim().length === 0) {
        throw new Error("GitHub Personal Access Token cannot be empty");
    }

    return token.trim();
}

/**
 * getBitbucketCredentials
 * Get Bitbucket OAuth credentials or App Password
 *
 * @name getBitbucketCredentials
 * @function
 * @return {Object}
 */
function getBitbucketCredentials() {
    Logger.log("Setting up Bitbucket authentication...", "info");
    Logger.log("", "info");
    Logger.log("Bitbucket supports App Passwords:", "info");
    Logger.log("  (OAuth 2.0 with limited, revocable scopes)", "info");
    Logger.log("", "info");

    return setupBitbucketAppPassword();
}

/**
 * setupBitbucketAppPassword
 * Setup Bitbucket App Password (OAuth-style)
 *
 * @name setupBitbucketAppPassword
 * @function
 * @return {Object}
 */
function setupBitbucketAppPassword() {
    Logger.log("App Password Setup Instructions:", "info");
    Logger.log("  1. Visit: https://bitbucket.org/account/settings/app-passwords/new", "info");
    Logger.log("  2. Create new App Password with label 'Repository Downloader'", "info");
    Logger.log("  3. Grant permissions:", "info");
    Logger.log("     - account:read", "info");
    Logger.log("     - repository:read", "info");
    Logger.log("     - pullrequest:read", "info");
    Logger.log("  4. Copy the generated password below", "info");
    Logger.log("", "info");

    const username = ReadlineSync.question("Enter your Bitbucket username: ");
    const appPassword = ReadlineSync.question("Enter your App Password: ", {
        hideEchoBack: true,
        mask: "*"
    });

    if (!username || !appPassword) {
        throw new Error("Bitbucket username and App Password cannot be empty");
    }

    return {
        type: "app_password",
        username: username.trim(),
        appPassword: appPassword.trim()
    };
}

/**
 * setupAuth
 * Interactive setup for both GitHub and Bitbucket authentication
 *
 * @name setupAuth
 * @function
 * @return {undefined}
 */
function setupAuth() {
    Logger.log("", "info");
    Logger.log("╔════════════════════════════════════════════════════════════╗", "info");
    Logger.log("║  Repository Downloader - OAuth Authentication Setup        ║", "info");
    Logger.log("║  Version 3.0.0 (Modern Token-Based Auth)                   ║", "info");
    Logger.log("╚════════════════════════════════════════════════════════════╝", "info");
    Logger.log("", "info");

    try {
        const githubToken = getGitHubToken();
        Logger.log("✓ GitHub token configured", "info");
        Logger.log("", "info");

        const bitbucketCreds = getBitbucketCredentials();
        Logger.log("✓ Bitbucket credentials configured", "info");
        Logger.log("", "info");

        const config = {
            github: {
                token: githubToken
            },
            bitbucket: {
                type: bitbucketCreds.type,
                username: bitbucketCreds.username,
                appPassword: bitbucketCreds.appPassword
            }
        };

        Fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        Logger.log("✓ Configuration saved to: config.json", "info");
        Logger.log("", "info");
        Logger.log("Next steps:", "info");
        Logger.log("  1. Run: npm start", "info");
        Logger.log("  2. Or: node github.js (GitHub only)", "info");
        Logger.log("  3. Or: node bitbucket.js (Bitbucket only)", "info");
        Logger.log("", "info");

        return config;
    } catch (e) {
        Logger.log("✗ Authentication setup failed", "error");
        Logger.log("  " + e.message, "error");
        Logger.log("", "info");
        process.exit(1);
    }
}

/**
 * loadConfig
 * Load configuration from config.json
 *
 * @name loadConfig
 * @function
 * @return {Object}
 */
function loadConfig() {
    if (!Fs.existsSync(configPath)) {
        Logger.log("config.json not found. Running setup...", "warn");
        Logger.log("", "info");
        return setupAuth();
    }

    try {
        return JSON.parse(Fs.readFileSync(configPath, "utf-8"));
    } catch (e) {
        Logger.log("Invalid config.json format: " + e.message, "error");
        process.exit(1);
    }
}

/**
 * validateConfig
 * Validate that required authentication fields are present
 *
 * @name validateConfig
 * @function
 * @param {Object} config The configuration object
 * @return {Boolean}
 */
function validateConfig(config) {
    const errors = [];

    if (!config.github || !config.github.token) {
        errors.push("Missing GitHub token in config.json");
    }

    if (!config.bitbucket || !config.bitbucket.username || !config.bitbucket.appPassword) {
        errors.push("Missing Bitbucket credentials in config.json");
    }

    if (errors.length > 0) {
        Logger.log("Configuration validation failed:", "error");
        errors.forEach(err => Logger.log("  ✗ " + err, "error"));
        Logger.log("", "info");
        Logger.log("Please run: npm run setup", "info");
        process.exit(1);
    }

    return true;
}

module.exports = {
    loadConfig: loadConfig,
    setupAuth: setupAuth,
    validateConfig: validateConfig,
    checkGhCli: checkGhCli,
    checkGit: checkGit,
    getGitHubTokenFromGhCli: getGitHubTokenFromGhCli,
    getGitHubUserFromGhCli: getGitHubUserFromGhCli,
    getGitUserEmail: getGitUserEmail,
    getGitUserName: getGitUserName
};
