package com.mvmcmd.launcher;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public final class MvmWallpaperCatalog {
    public static final class Spec {
        public final String id, title, asset, style;
        public final float focusX, focusY, focusRadius, depth, drift;
        Spec(String id, String title, String asset, String style, float fx, float fy, float fr, float depth, float drift) {
            this.id=id; this.title=title; this.asset=asset; this.style=style;
            focusX=fx; focusY=fy; focusRadius=fr; this.depth=depth; this.drift=drift;
        }
    }
    private static final List<Spec> ITEMS = Collections.unmodifiableList(Arrays.asList(
        new Spec("scarlet_focus","Scarlet Focus","wallpapers_b64/scarlet_focus.txt","anime",.52f,.38f,.30f,.11f,.033f),
        new Spec("midnight_tree","Midnight Tree","wallpapers/midnight_tree.webp","tree",.50f,.47f,.30f,.10f,.020f),
        new Spec("moon_garden","Moon Garden","wallpapers/moon_garden.webp","garden",.56f,.45f,.38f,.10f,.022f),
        new Spec("quiet_grove","Quiet Grove","wallpapers/quiet_grove.webp","grove",.60f,.50f,.42f,.10f,.026f),
        new Spec("orbital_bloom","Orbital Bloom","wallpapers/orbital_bloom.webp","orbital",.50f,.50f,.38f,.10f,.030f),
        new Spec("midnight_bmw","Midnight BMW","wallpapers/midnight_bmw.webp","bmw",.52f,.58f,.40f,.085f,.026f),
        new Spec("crimson_spider","Crimson Spider","wallpapers/crimson_spider.webp","spider",.50f,.57f,.35f,.12f,.032f),
        new Spec("silent_alps","Silent Alps","wallpapers/silent_alps.webp","alps",.50f,.43f,.44f,.07f,.018f),
        new Spec("azure_creek","Azure Creek","wallpapers/azure_creek.webp","creek",.54f,.57f,.38f,.10f,.030f),
        new Spec("starlit_field","Starlit Field","wallpapers/starlit_field.webp","field",.50f,.55f,.38f,.10f,.034f),
        new Spec("fluid_signal","Fluid Signal","wallpapers/fluid_signal.webp","ribbon",.53f,.50f,.44f,.11f,.028f),
        new Spec("red_ronin","Red Ronin","wallpapers/red_ronin.webp","ronin",.50f,.69f,.26f,.13f,.030f),
        new Spec("gotham_rain","Gotham Rain","wallpapers/gotham_rain.webp","batman",.50f,.47f,.37f,.10f,.028f),
        new Spec("deep_space","Deep Space","wallpapers/deep_space.webp","space",.50f,.48f,.40f,.095f,.040f),
        new Spec("midnight_p1","Midnight P1","wallpapers/midnight_p1.webp","p1",.68f,.58f,.31f,.09f,.025f),
        new Spec("amber_orbit","Amber Orbit","wallpapers/amber_orbit.webp","amber",.50f,.46f,.30f,.105f,.032f),
        new Spec("ice_eyes","Ice Eyes","wallpapers/ice_eyes.webp","cat",.50f,.48f,.30f,.11f,.035f)
    ));
    private MvmWallpaperCatalog() {}
    public static List<Spec> all(){ return ITEMS; }
    public static Spec find(String id){
        if(id!=null) for(Spec s:ITEMS) if(s.id.equals(id)) return s;
        return ITEMS.get(0);
    }
}
