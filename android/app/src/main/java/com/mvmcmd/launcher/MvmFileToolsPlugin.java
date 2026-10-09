package com.mvmcmd.launcher;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Context;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import androidx.activity.result.ActivityResult;
import androidx.documentfile.provider.DocumentFile;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.util.ArrayDeque;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

@CapacitorPlugin(name = "MvmFileTools")
public class MvmFileToolsPlugin extends Plugin {
    private static final int MAX_SCAN = 5000;

    @PluginMethod
    public void getStorageOverview(PluginCall call) {
        try {
            android.os.StatFs fs = new android.os.StatFs(android.os.Environment.getDataDirectory().getPath());
            long total = fs.getTotalBytes();
            long available = fs.getAvailableBytes();
            JSObject out = new JSObject();
            out.put("totalBytes", total);
            out.put("availableBytes", available);
            out.put("usedBytes", Math.max(0L, total - available));
            out.put("source", "Android StatFs app data volume");
            call.resolve(out);
        } catch (Exception e) {
            call.reject("Unable to read Android storage statistics", e);
        }
    }

    @PluginMethod
    public void chooseFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "folderPickerResult");
    }

    @ActivityCallback
    private void folderPickerResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != android.app.Activity.RESULT_OK || result.getData() == null
            || result.getData().getData() == null) {
            JSObject out = new JSObject(); out.put("cancelled", true); out.put("granted", false);
            call.resolve(out); return;
        }
        Intent data = result.getData();
        Uri uri = data.getData();
        int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        try {
            getContext().getContentResolver().takePersistableUriPermission(uri, flags);
        } catch (SecurityException ignored) {
            // Keep the returned URI scoped to this process if the provider cannot persist the grant.
        }
        DocumentFile folder = DocumentFile.fromTreeUri(getContext(), uri);
        JSObject out = new JSObject();
        out.put("granted", folder != null && folder.canRead());
        out.put("uri", uri.toString());
        out.put("name", folder != null && folder.getName() != null ? folder.getName() : "selected folder");
        call.resolve(out);
    }

    @PluginMethod
    public void listFolder(PluginCall call) {
        String raw = call.getString("uri");
        String query = call.getString("query", "").trim().toLowerCase(Locale.ROOT);
        long minBytes = call.getLong("minBytes", 0L);
        int limit = Math.max(1, Math.min(1000, call.getInt("limit", 200)));
        if (raw == null || !raw.startsWith("content://") || minBytes < 0) {
            call.reject("A valid scoped content URI and non-negative size filter are required"); return;
        }
        try {
            Uri treeUri = Uri.parse(raw);
            DocumentFile root = DocumentFile.fromTreeUri(getContext(), treeUri);
            if (root == null || !root.canRead() || !root.isDirectory()) {
                call.reject("Selected folder is not readable"); return;
            }
            ArrayDeque<DocumentFile> queue = new ArrayDeque<>();
            queue.add(root);
            Set<String> seen = new HashSet<>();
            JSArray items = new JSArray();
            int scanned = 0;
            boolean truncated = false;
            while (!queue.isEmpty()) {
                DocumentFile folder = queue.removeFirst();
                DocumentFile[] children = folder.listFiles();
                for (DocumentFile item : children) {
                    if (scanned >= MAX_SCAN) { truncated = true; queue.clear(); break; }
                    scanned++;
                    Uri uri = item.getUri();
                    if (!seen.add(uri.toString())) continue;
                    String name = item.getName() == null ? "unnamed" : item.getName();
                    if (item.isDirectory()) {
                        if (!name.startsWith(".") && !name.equalsIgnoreCase("Android")) queue.addLast(item);
                    }
                    long size = item.length();
                    if (!query.isEmpty() && !name.toLowerCase(Locale.ROOT).contains(query)) continue;
                    if (!item.isDirectory() && size < minBytes) continue;
                    if (items.length() >= limit) { truncated = true; queue.clear(); break; }
                    JSObject row = new JSObject();
                    row.put("id", uri.toString());
                    row.put("name", name);
                    row.put("uri", uri.toString());
                    row.put("mimeType", item.getType() == null ? "application/octet-stream" : item.getType());
                    if (!item.isDirectory()) row.put("sizeBytes", size);
                    row.put("modifiedAt", item.lastModified());
                    row.put("isDirectory", item.isDirectory());
                    items.put(row);
                }
            }
            JSObject out = new JSObject();
            out.put("items", items);
            out.put("scanned", scanned);
            out.put("truncated", truncated);
            call.resolve(out);
        } catch (SecurityException e) {
            call.reject("Android denied access to this folder", e);
        } catch (Exception e) {
            call.reject("Unable to scan selected folder", e);
        }
    }

    @PluginMethod
    public void shareFile(PluginCall call) {
        String raw = call.getString("uri");
        if (raw == null || !raw.startsWith("content://")) { call.reject("A scoped content URI is required"); return; }
        try {
            Uri uri = Uri.parse(raw);
            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType(getContext().getContentResolver().getType(uri) == null ? "*/*" : getContext().getContentResolver().getType(uri));
            intent.putExtra(Intent.EXTRA_STREAM, uri);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(Intent.createChooser(intent, "Share file"));
            JSObject out = new JSObject(); out.put("started", true); call.resolve(out);
        } catch (Exception e) {
            JSObject out = new JSObject(); out.put("started", false); out.put("reason", "No compatible share target or URI permission was available."); call.resolve(out);
        }
    }
}
