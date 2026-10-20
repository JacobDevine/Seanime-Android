plugins {
    id("com.android.application")
}

android {
    namespace = "com.seanime.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.seanime.app"
        minSdk = 21
        // Kept at 30 to match previous releases; raising it changes storage and
        // foreground-service behavior and needs testing first.
        targetSdk = 30
        versionCode = 7
        versionName = "0.7.0a"
        manifestPlaceholders["appLabel"] = "Seanime"
    }

    buildTypes {
        debug {
            // Installs next to the release app so testing doesn't touch its data
            applicationIdSuffix = ".debug"
            manifestPlaceholders["appLabel"] = "Seanime Debug"
        }
        release {
            isMinifyEnabled = false
            // Signing config for releases is set up separately (see DEVELOPMENT.md).
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    packaging {
        jniLibs {
            // SeanimeService copies libseanime.so out of nativeLibraryDir,
            // so native libs must be extracted at install time.
            useLegacyPackaging = true
        }
    }

    lint {
        abortOnError = false
    }
}
