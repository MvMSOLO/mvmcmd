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
import java.io.InputStream;
import java.io.OutputStream;
import java.io.BufferedOutputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
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
            android.os.StatFs fs = new android.os.StatFs(android.os.Environment.getExternalStorageDirectory().getPath());
            long total = fs.getTotalBytes();
            long available = fs.getAvailableBytes();
            JSObject out = new JSObject();
            out.put("totalBytes", total);
            out.put("availableBytes", available);
            out.put("usedBytes", Math.max(0L, total - available));
            out.put("source", "Android StatFs shared storage volume");
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
    public void copyMoveFile(PluginCall call) {
        String sourceRaw = call.getString("sourceUri");
        String destinationRaw = call.getString("destinationTreeUri");
        String name = call.getString("name");
        boolean move = call.getBoolean("move", false);
        if (sourceRaw == null || !sourceRaw.startsWith("content://") || destinationRaw == null || !destinationRaw.startsWith("content://") || name == null || name.trim().isEmpty() || name.contains("/") || name.contains("\\") || name.contains("\0")) { call.reject("Valid scoped source/destination URIs and safe name required"); return; }
        try {
            DocumentFile source = DocumentFile.fromSingleUri(getContext(), Uri.parse(sourceRaw));
            if (source == null) source = DocumentFile.fromTreeUri(getContext(), Uri.parse(sourceRaw));
            DocumentFile destination = DocumentFile.fromTreeUri(getContext(), Uri.parse(destinationRaw));
            if (source == null || !source.exists() || source.isDirectory() || destination == null || !destination.canWrite()) { call.reject("Source or destination is not accessible"); return; }
            String safeName = name.trim();
            if (destination.findFile(safeName) != null) { call.reject("Destination name already exists"); return; }
            DocumentFile output = destination.createFile(source.getType() == null ? "application/octet-stream" : source.getType(), safeName);
            if (output == null) { call.reject("Could not create destination"); return; }
            try (InputStream in = getContext().getContentResolver().openInputStream(source.getUri()); OutputStream out = getContext().getContentResolver().openOutputStream(output.getUri(), "w")) {
                if (in == null || out == null) throw new java.io.IOException("Could not open stream");
                byte[] buffer = new byte[65536]; int count;
                while ((count = in.read(buffer)) != -1) out.write(buffer, 0, count);
            } catch (Exception e) { output.delete(); throw e; }
            if (move && !source.delete()) { JSObject out = new JSObject(); out.put("status","failed"); out.put("message","Copy succeeded but Android did not confirm source deletion; original remains."); out.put("uri",output.getUri().toString()); call.resolve(out); return; }
            JSObject out = new JSObject(); out.put("status","verified"); out.put("message",move ? "Copy created and source removal confirmed." : "Copy created."); out.put("uri",output.getUri().toString()); call.resolve(out);
        } catch (Exception e) { call.reject("Scoped copy/move failed", e); }
    }

    @PluginMethod
    public void deleteFile(PluginCall call) {
        String raw = call.getString("uri");
        boolean confirmed = call.getBoolean("confirmed", false);
        if (!confirmed) { call.reject("Explicit confirmation required"); return; }
        if (raw == null || !raw.startsWith("content://")) { call.reject("Scoped content URI required"); return; }
        try {
            Uri uri = Uri.parse(raw);
            DocumentFile file = DocumentFile.fromSingleUri(getContext(), uri);
            if (file == null) file = DocumentFile.fromTreeUri(getContext(), uri);
            if (file == null || !file.exists()) { call.reject("Selected item no longer exists"); return; }
            if (file.isDirectory()) { call.reject("Directory deletion is blocked; select an individual file instead"); return; }
            String name = file.getName() == null ? "" : file.getName();
            if (name.equalsIgnoreCase("Android") || name.equalsIgnoreCase("data") || name.equalsIgnoreCase("obb") || name.equalsIgnoreCase("system")) {
                call.reject("Protected/high-risk item deletion blocked"); return;
            }
            boolean deleted = file.delete();
            boolean absentAfterDelete = deleted && !file.exists();
            JSObject out = new JSObject();
            out.put("deleted", absentAfterDelete);
            out.put("message", absentAfterDelete ? "Android confirmed the selected file is no longer present." : "Android did not verify that the selected file was removed.");
            call.resolve(out);
        } catch (Exception e) { call.reject("Scoped deletion failed", e); }
    }

    @PluginMethod
    public void createArchive(PluginCall call) {
        String treeRaw = call.getString("treeUri");
        String name = call.getString("name");
        JSArray uris = call.getArray("uris");
        if (treeRaw == null || !treeRaw.startsWith("content://") || name == null
            || !name.matches("(?i)[a-z0-9 _.-]{1,76}\\.zip") || uris == null || uris.length() == 0 || uris.length() > 500) {
            call.reject("Scoped destination, safe ZIP name and 1–500 files required"); return;
        }
        try {
            DocumentFile folder = DocumentFile.fromTreeUri(getContext(), Uri.parse(treeRaw));
            if (folder == null || !folder.canWrite() || folder.findFile(name) != null) {
                call.reject("Destination is not writable or ZIP already exists"); return;
            }
            ArrayList<DocumentFile> sources = new ArrayList<>();
            for (int i = 0; i < uris.length(); i++) {
                String raw = uris.getString(i);
                if (raw == null || !raw.startsWith("content://")) { call.reject("Every ZIP input must be a scoped content URI"); return; }
                DocumentFile source = DocumentFile.fromSingleUri(getContext(), Uri.parse(raw));
                if (source == null || !source.exists() || source.isDirectory() || !source.canRead()) {
                    call.reject("Every ZIP input must be an existing readable file"); return;
                }
                sources.add(source);
            }
            if (sources.isEmpty()) { call.reject("No readable files selected"); return; }
            DocumentFile archive = folder.createFile("application/zip", name);
            if (archive == null) { call.reject("Could not create ZIP"); return; }
            try (OutputStream out = getContext().getContentResolver().openOutputStream(archive.getUri(), "w")) {
                if (out == null) throw new java.io.IOException("Could not open ZIP output");
                try (ZipOutputStream zip = new ZipOutputStream(new BufferedOutputStream(out))) {
                    Set<String> names = new HashSet<>();
                    int index = 0;
                    for (DocumentFile source : sources) {
                        String base = source.getName() == null ? "file-" + index : source.getName();
                        String entry = base;
                        int suffix = 1;
                        while (!names.add(entry)) entry = base + "-" + (suffix++);
                        zip.putNextEntry(new ZipEntry(entry));
                        try (InputStream in = getContext().getContentResolver().openInputStream(source.getUri())) {
                            if (in == null) throw new java.io.IOException("Could not read " + entry);
                            byte[] buffer = new byte[65536];
                            int count;
                            while ((count = in.read(buffer)) != -1) zip.write(buffer, 0, count);
                        }
                        zip.closeEntry();
                        index++;
                    }
                }
            } catch (Exception e) {
                archive.delete();
                throw e;
            }
            JSObject out = new JSObject();
            out.put("created", true);
            out.put("uri", archive.getUri().toString());
            out.put("message", "ZIP created from all selected scoped files.");
            call.resolve(out);
        } catch (Exception e) { call.reject("ZIP creation failed", e); }
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
