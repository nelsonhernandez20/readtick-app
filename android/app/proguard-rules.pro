-keep class com.readtik.mobile.** { *; }
-keepattributes *Annotation*, InnerClasses, Signature, Exception

# Kotlinx serialization
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class **$$serializer { *; }
-dontwarn kotlinx.serialization.**

# OkHttp / SSE
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Supabase / Ktor
-dontwarn io.ktor.**
-dontwarn io.github.jan.supabase.**
-keep class io.github.jan.supabase.** { *; }
-keep class io.ktor.** { *; }

# Compose
-dontwarn androidx.compose.**
