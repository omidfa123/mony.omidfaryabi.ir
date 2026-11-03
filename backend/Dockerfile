FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api .

FROM alpine:3.20
# poppler-utils provides pdftotext, which reads the bank PDF
RUN apk add --no-cache poppler-utils ca-certificates tzdata \
 && adduser -D -u 10001 app && mkdir /data && chown app /data
COPY --from=build /out/api /usr/local/bin/api
USER app
ENV DATA_DIR=/data LISTEN=:8080 TZ=Asia/Tehran
EXPOSE 8080
CMD ["api"]
