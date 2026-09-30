package com.mvmcmd.launcher;

import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;

public final class MvmNotificationSound {
    private MvmNotificationSound(){}
    public static void play(){play("normal");}
    public static void playCode(){play("code");}
    public static void playCall(){play("call");}
    private static void play(String kind){
        final int rate=16000; final int count=(int)(rate*(kind.equals("call")?.78f:kind.equals("code")?.32f:.42f)); final short[] pcm=new short[count];
        for(int i=0;i<count;i++){double t=i/(double)rate,env=Math.exp(-(kind.equals("call")?2.8:8.0)*t);double sample=0;
            if(kind.equals("call")){
                double phase=t%0.26; double burst=Math.exp(-18*phase); sample=.25*Math.sin(2*Math.PI*(620+180*Math.sin(2*Math.PI*2.2*t))*t)*burst;
            }else if(kind.equals("code")){
                sample=.28*Math.sin(2*Math.PI*780*t)*env+.12*Math.sin(2*Math.PI*1560*t)*Math.exp(-15*t);
            }else{
                double f=520+720*Math.min(1,t/.42f);sample=.30*Math.sin(2*Math.PI*f*t)*env+.13*Math.sin(2*Math.PI*1040*t)*Math.exp(-12*t)+.08*Math.sin(2*Math.PI*1560*t)*Math.exp(-16*t);
            }
            pcm[i]=(short)Math.max(-32767,Math.min(32767,sample*32767));}
        new Thread(()->{AudioTrack track=null;try{
            AudioAttributes attrs=new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
            AudioFormat fmt=new AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(rate).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build();
            track=new AudioTrack.Builder().setAudioAttributes(attrs).setAudioFormat(fmt).setTransferMode(AudioTrack.MODE_STATIC).setBufferSizeInBytes(pcm.length*2).build();
            track.write(pcm,0,pcm.length);track.play();Thread.sleep((long)(count*1000d/rate));
        }catch(Exception ignored){}finally{if(track!=null){try{track.stop();}catch(Exception ignored){}track.release();}}},"mvm-notify-sound").start();
    }
}