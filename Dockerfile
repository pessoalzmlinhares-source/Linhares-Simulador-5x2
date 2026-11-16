FROM rust:1-bookworm AS build
WORKDIR /work
COPY Cargo.toml Cargo.toml
COPY src src
COPY web web
RUN cargo build --release

FROM debian:bookworm-slim
RUN useradd --system --uid 10001 app
COPY --from=build /work/target/release/linhares-escala5x2-web /usr/local/bin/linhares-escala5x2-web
USER app
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["/usr/local/bin/linhares-escala5x2-web"]
