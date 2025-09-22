const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('./config');

class JWTManager {
    constructor() {
        this.secret = config.jwt.secret;
        this.expiresIn = config.jwt.expiresIn;
        this.refreshExpiresIn = config.jwt.refreshExpiresIn;
        this.issuer = config.jwt.issuer;
        this.audience = config.jwt.audience;
    }

    // Generate access token
    generateAccessToken(user) {
        const payload = {
            sub: user.id,
            username: user.username,
            role: user.role,
            branch_id: user.branch_id,
            is_main_branch: user.is_main_branch,
            permissions: user.permissions || [],
            type: 'access'
        };

        return jwt.sign(payload, this.secret, {
            expiresIn: this.expiresIn,
            issuer: this.issuer,
            audience: this.audience
        });
    }

    // Generate refresh token
    generateRefreshToken(userId, deviceInfo = null) {
        const payload = {
            sub: userId,
            type: 'refresh',
            device: deviceInfo
        };

        return jwt.sign(payload, this.secret, {
            expiresIn: this.refreshExpiresIn,
            issuer: this.issuer,
            audience: this.audience
        });
    }

    // Verify access token
    verifyAccessToken(token) {
        try {
            const decoded = jwt.verify(token, this.secret, {
                issuer: this.issuer,
                audience: this.audience
            });

            if (decoded.type !== 'access') {
                throw new Error('Invalid token type');
            }

            return {
                valid: true,
                payload: decoded
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    // Verify refresh token
    verifyRefreshToken(token) {
        try {
            const decoded = jwt.verify(token, this.secret, {
                issuer: this.issuer,
                audience: this.audience
            });

            if (decoded.type !== 'refresh') {
                throw new Error('Invalid token type');
            }

            return {
                valid: true,
                payload: decoded
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    // Decode token without verification
    decodeToken(token) {
        try {
            return jwt.decode(token);
        } catch (error) {
            return null;
        }
    }

    // Generate random token for password reset
    generatePasswordResetToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Get token expiration time
    getTokenExpiration(token) {
        try {
            const decoded = jwt.decode(token);
            if (decoded && decoded.exp) {
                return new Date(decoded.exp * 1000);
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    // Check if token is expired
    isTokenExpired(token) {
        const expiration = this.getTokenExpiration(token);
        if (!expiration) return true;
        return Date.now() >= expiration.getTime();
    }
}

// Create singleton instance
const jwtManager = new JWTManager();

module.exports = jwtManager;
