package com.mvmcmd.launcher;

import android.content.Intent;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;

public final class MvmQrTileService extends TileService {

    @Override
    public void onStartListening() {
        super.onStartListening();
        Tile tile = getQsTile();
        if (tile != null) {
            tile.setLabel("QR Scanner");
            tile.setIcon(Icon.createWithResource(this, R.drawable.mvmcmd_logo));
            tile.setState(Tile.STATE_INACTIVE);
            tile.updateTile();
        }
    }

    @Override
    public void onClick() {
        super.onClick();

        Intent intent = new Intent(this, MvmQrActivity.class);
        intent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK
                        | Intent.FLAG_ACTIVITY_CLEAR_TOP
                        | Intent.FLAG_ACTIVITY_SINGLE_TOP
        );

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                startActivityAndCollapse(intent);
            } else {
                startActivity(intent);
            }
        } finally {
            Tile tile = getQsTile();
            if (tile != null) {
                tile.setState(Tile.STATE_INACTIVE);
                tile.updateTile();
            }
        }
    }
}
