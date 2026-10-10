package com.mvmcmd.launcher;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * Pure JVM unit tests for the path/ZIP safety contracts used by MvmFileToolsPlugin.
 * These mirror the private static helpers so CI can guard the security rules without
 * requiring a full Android instrumented environment.
 */
public class MvmPathSafetyTest {

    private static final int MAX_FILENAME_LENGTH = 180;

    private static boolean isSafeLeafName(String value) {
        if (value == null) return false;
        String name = value.trim();
        if (name.isEmpty() || name.length() > MAX_FILENAME_LENGTH || ".".equals(name) || "..".equals(name)) return false;
        if (name.endsWith(".") || name.endsWith(" ")) return false;
        if (name.matches("(?i)^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\\..*)?$")) return false;
        for (int i = 0; i < name.length(); i++) {
            char c = name.charAt(i);
            if (c < 0x20 || c == 0x7f || c == '/' || c == '\\' || c == ':' || c == '<' || c == '>' || c == '"' || c == '|' || c == '?' || c == '*') {
                return false;
            }
        }
        return true;
    }

    private static String safeZipEntryName(String raw, int index) {
        String fallback = "file-" + Math.max(0, index);
        if (raw == null || raw.trim().isEmpty() || ".".equals(raw.trim()) || "..".equals(raw.trim())) return fallback;
        String[] parts = raw.replaceAll("[\\p{Cntrl}]", "").split("[/\\\\]+");
        StringBuilder joined = new StringBuilder();
        for (String part : parts) {
            if (part.isEmpty()) continue;
            if (joined.length() > 0) joined.append('_');
            joined.append(".".equals(part) || "..".equals(part) ? "_" : part.replace(':', '_'));
        }
        String name = joined.toString().trim();
        if (name.isEmpty() || ".".equals(name) || "..".equals(name)) name = fallback;
        if (name.length() > MAX_FILENAME_LENGTH) name = name.substring(0, MAX_FILENAME_LENGTH);
        while (name.endsWith(".") || name.endsWith(" ")) name = name.substring(0, name.length() - 1);
        return name.isEmpty() ? fallback : name;
    }

    @Test
    public void safeLeafName_acceptsNormalFileNames() {
        assertTrue(isSafeLeafName("photo.jpg"));
        assertTrue(isSafeLeafName("report_2026.pdf"));
    }

    @Test
    public void safeLeafName_rejectsTraversalAndReserved() {
        assertFalse(isSafeLeafName(".."));
        assertFalse(isSafeLeafName("."));
        assertFalse(isSafeLeafName("../secret.txt"));
        assertFalse(isSafeLeafName("CON"));
        assertFalse(isSafeLeafName("NUL.txt"));
        assertFalse(isSafeLeafName("a/b.txt"));
        assertFalse(isSafeLeafName("bad:name.txt"));
        assertFalse(isSafeLeafName(""));
        assertFalse(isSafeLeafName(null));
    }

    @Test
    public void safeZipEntryName_sanitizesPathParts() {
        assertEquals("file-0", safeZipEntryName(null, 0));
        assertEquals("file-1", safeZipEntryName("..", 1));
        assertEquals("docs_report.pdf", safeZipEntryName("docs/report.pdf", 0));
        assertEquals("a_b", safeZipEntryName("a:b", 0));
    }

    @Test
    public void safeZipEntryName_truncatesLongNames() {
        StringBuilder longName = new StringBuilder();
        for (int i = 0; i < 300; i++) longName.append('a');
        String result = safeZipEntryName(longName.toString(), 0);
        assertTrue(result.length() <= MAX_FILENAME_LENGTH);
    }
}
