FROM python:3.13-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    less \
    make \
    man-db \
    openssh-client \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Trust GitHub's host key so read-only ~/.ssh mounts don't need to
# append to a writable known_hosts on first connection.
RUN mkdir -p /etc/ssh && ssh-keyscan -H github.com >> /etc/ssh/ssh_known_hosts

# Install Node.js 22
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# JRE for the SonarLint VS Code extension. SonarLint requires a JAVA_HOME
# directory (not just `java` on PATH) — the arch-specific install path
# is unsuitable on a multi-arch dev container, so symlink it to a stable
# /usr/lib/jvm/default-java for both the ENV below and the workspace
# `sonarlint.ls.javaHome` setting to reference.
RUN apt-get update && apt-get install -y \
    openjdk-21-jre-headless \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/lib/jvm/java-21-openjdk-$(dpkg --print-architecture) /usr/lib/jvm/default-java
ENV JAVA_HOME=/usr/lib/jvm/default-java

# Install uv (Python package manager) and pre-commit (git hook runner).
# pre-commit is installed globally so `pre-commit install` works regardless
# of which project venv the shell sits in.
RUN pip install --no-cache-dir --upgrade pip uv pre-commit

# Create non-root user
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m -s /bin/bash $USERNAME \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

USER $USERNAME

WORKDIR /workspace
