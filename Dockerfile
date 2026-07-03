FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends default-mysql-client gzip ca-certificates curl unzip \
  && curl -fsSL "https://downloads.rclone.org/rclone-current-linux-$(dpkg --print-architecture).zip" -o /tmp/rclone.zip \
  && unzip -q /tmp/rclone.zip -d /tmp \
  && install /tmp/rclone-*-linux-*/rclone /usr/local/bin/rclone \
  && rm -rf /tmp/rclone* \
  && apt-get purge -y curl unzip \
  && apt-get autoremove -y \
  && rm -rf /var/lib/apt/lists/*

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN --mount=type=cache,id=pnpm-store-v2,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev", "--host", "0.0.0.0"]
