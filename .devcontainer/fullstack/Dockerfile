FROM python:3.13-slim

RUN apt-get update && apt-get install -y \
    curl \
    git \
    less \
    make \
    man-db \
    openssh-client \
    sudo \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /etc/ssh && ssh-keyscan -H github.com >> /etc/ssh/ssh_known_hosts

RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y \
    openjdk-21-jre-headless \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/lib/jvm/java-21-openjdk-$(dpkg --print-architecture) /usr/lib/jvm/default-java
ENV JAVA_HOME=/usr/lib/jvm/default-java

ARG SONAR_SCANNER_VERSION=7.1.0.4889
RUN apt-get update && apt-get install -y unzip \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL -o /tmp/sonar-scanner.zip \
        https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-${SONAR_SCANNER_VERSION}.zip \
    && unzip -q /tmp/sonar-scanner.zip -d /opt \
    && rm /tmp/sonar-scanner.zip \
    && mv /opt/sonar-scanner-${SONAR_SCANNER_VERSION} /opt/sonar-scanner \
    && ln -s /opt/sonar-scanner/bin/sonar-scanner /usr/local/bin/sonar-scanner

RUN pip install --no-cache-dir --upgrade pip uv pre-commit

ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m -s /bin/bash $USERNAME \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

USER $USERNAME

WORKDIR /workspace
