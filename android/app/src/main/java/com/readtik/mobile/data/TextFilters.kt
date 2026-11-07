package com.readtik.mobile.data

object TextFilters {
    fun normalize(text: String): String {
        return text.lowercase()
            .replace(Regex("[\\u0300-\\u036f]"), "")
            .map { ch ->
                when (ch) {
                    '@', '4' -> 'a'
                    '3' -> 'e'
                    '1', '!', '|' -> 'i'
                    '0' -> 'o'
                    '$', '5' -> 's'
                    '7', '+' -> 't'
                    else -> ch
                }
            }
            .joinToString("")
            .let { raw ->
                java.text.Normalizer.normalize(raw, java.text.Normalizer.Form.NFD)
                    .replace(Regex("[\\u0300-\\u036f]"), "")
            }
    }

    fun containsBannedWord(text: String, bannedWords: List<String>): Boolean {
        if (bannedWords.isEmpty() || text.isBlank()) return false
        val wordsList = bannedWords.flatMap { it.split(Regex("[\\r\\n,;]+")) }
            .map { it.trim() }
            .filter { it.isNotEmpty() }
        if (wordsList.isEmpty()) return false

        val normalized = normalize(text)
        val compact = normalized.replace(Regex("[^a-z0-9]"), "")

        return wordsList.any { rawItem ->
            val cleanItem = normalize(rawItem.trim()).replace(Regex("\\s+"), " ")
            if (cleanItem.isEmpty()) return@any false

            if (cleanItem.contains(' ')) {
                if (normalized.contains(cleanItem)) return@any true
                val phraseCompact = cleanItem.replace(Regex("[^a-z0-9]"), "")
                if (phraseCompact.length >= 4 && compact.contains(phraseCompact)) return@any true
                false
            } else {
                val boundary = Regex("(^|\\W)${Regex.escape(cleanItem)}(\\W|$)", RegexOption.IGNORE_CASE)
                if (boundary.containsMatchIn(normalized)) return@any true
                if (cleanItem.length >= 5 && normalized.contains(cleanItem)) return@any true
                val compactWord = cleanItem.replace(Regex("[^a-z0-9]"), "")
                compactWord.length >= 4 && compact.contains(compactWord)
            }
        }
    }
}
