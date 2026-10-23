#!/usr/bin/env bash
# Build the Seanime server (libseanime.so) for Android and install it into jniLibs.
# Usage: scripts/build-server.sh <seanime version, e.g. 3.10.4>
set -euo pipefail

VERSION="${1:?usage: $0 <seanime version, e.g. 3.10.4>}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${HOME}/.cache/seanime-server-build/v${VERSION}"
NDK_VERSION="26.3.11579264"
NDK="${ANDROID_HOME:-$HOME/Android/Sdk}/ndk/${NDK_VERSION}/toolchains/llvm/prebuilt/linux-x86_64"

[ -d "$NDK" ] || { echo "NDK ${NDK_VERSION} not found at $NDK" >&2; exit 1; }

echo "==> Fetching Seanime v${VERSION} into ${WORK}"
if [ ! -d "$WORK/.git" ]; then
    rm -rf "$WORK"
    git clone -q --depth 1 --branch "v${VERSION}" https://github.com/5rahim/seanime.git "$WORK"
fi
cd "$WORK"
git checkout -q -- main.go go.mod go.sum

echo "==> Building web interface"
(cd seanime-web && npm ci --no-audit --no-fund >/dev/null && npm run build >/dev/null)
rm -rf web && cp -r seanime-web/out web

echo "==> Applying Android patches (see DEVELOPMENT.md)"
cat > main.go <<'EOF'
package main

import (
	"embed"
	"seanime/internal/server"
	"context"
	"net"
)

func init() {
    net.DefaultResolver = &net.Resolver{
        PreferGo: true,
        Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
            d := net.Dialer{}
            return d.DialContext(ctx, "udp", "8.8.8.8:53")
        },
    }
}

//go:embed all:web
var WebFS embed.FS

//go:embed internal/icon/logo.png
var embeddedLogo []byte

func main() {
	server.StartServer(WebFS, embeddedLogo)
}
EOF
mkdir -p patches/anet
printf 'module github.com/wlynxg/anet\n\ngo 1.21\n' > patches/anet/go.mod
cat > patches/anet/anet.go <<'EOF'
package anet

import "net"

func Interfaces() ([]net.Interface, error) { return net.Interfaces() }

func InterfaceAddrs() ([]net.Addr, error) { return net.InterfaceAddrs() }

func InterfaceByIndex(index int) (*net.Interface, error) { return net.InterfaceByIndex(index) }

func InterfaceByName(name string) (*net.Interface, error) { return net.InterfaceByName(name) }

func InterfaceAddrsByInterface(ifi *net.Interface) ([]net.Addr, error) { return ifi.Addrs() }

func SetAndroidVersion(version uint) {}
EOF
ANET_VERSION="$(go list -m -f '{{.Version}}' github.com/wlynxg/anet)"
go mod edit -replace "github.com/wlynxg/anet@${ANET_VERSION}=./patches/anet"
go mod tidy

echo "==> Building arm64"
GOOS=android GOARCH=arm64 CGO_ENABLED=0 \
    go build -tags android -trimpath -ldflags="-s -w" -o seanime-arm64 .

echo "==> Building armeabi-v7a"
CC="$NDK/bin/armv7a-linux-androideabi21-clang" CXX="$NDK/bin/armv7a-linux-androideabi21-clang++" \
    GOOS=android GOARCH=arm GOARM=7 CGO_ENABLED=1 \
    go build -tags android -trimpath -ldflags="-s -w" -o seanime-arm32 .

echo "==> Installing into jniLibs"
JNI="$REPO/app/src/main/jniLibs"
cp seanime-arm64 "$JNI/arm64-v8a/libseanime.so"
cp seanime-arm32 "$JNI/armeabi-v7a/libseanime.so"
cp "$NDK/sysroot/usr/lib/arm-linux-androideabi/libc++_shared.so" "$JNI/armeabi-v7a/"

grep -m1 'Version *= *"' internal/constants/constants.go
ls -la "$JNI"/*/libseanime.so
echo "Done. Next: ./gradlew clean assembleRelease"
