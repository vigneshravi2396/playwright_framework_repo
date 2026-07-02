# Base: Microsoft Playwright
FROM mcr.microsoft.com/playwright:v1.55.0-noble

USER root

# Install required tools + Chrome + AWS CLI v2
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        zip \
        unzip \
        curl \
        gnupg && \
    \
    # Install Google Chrome
    curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
        > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends google-chrome-stable && \
    \
    # Install AWS CLI v2
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    \
    # Cleanup
    rm -rf aws awscliv2.zip /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN if [ -f "package-lock.json" ]; then \
        npm ci --prefer-offline --no-audit --no-fund; \
    else \
        npm install --prefer-offline --no-audit --no-fund; \
    fi

# Switch to non-root
USER 1000

CMD ["bash"]