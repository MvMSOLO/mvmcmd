package com.mvmcmd.launcher;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.*;
import java.util.ArrayList;
import java.util.List;

public class MvmEnglishActivity extends Activity {
    private static final int BG=Color.rgb(7,9,13), PANEL=Color.rgb(15,18,25), LINE=Color.rgb(37,43,54);
    private static final int FG=Color.rgb(244,247,250), MUTED=Color.rgb(145,154,171), ACCENT=Color.rgb(185,255,74);
    private LinearLayout root,content,nav; private TextView title,sub,score; private int index=0,correct=0; private String mode="home";
    private final List<Q> questions=new ArrayList<>();
    static class Q { String level,skill,prompt,answer; String[] options; Q(String l,String s,String p,String a,String...o){level=l;skill=s;prompt=p;answer=a;options=o;} }
    @Override protected void onCreate(Bundle b){super.onCreate(b);seed();home();}
    private int dp(int v){return(int)(v*getResources().getDisplayMetrics().density+.5f);}
    private TextView tv(String s,float z,int c){TextView t=new TextView(this);t.setText(s);t.setTextColor(c);t.setTextSize(z);t.setFontFeatureSettings("kern");return t;}
    private LinearLayout col(){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);return l;}
    private LinearLayout row(){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.HORIZONTAL);l.setGravity(Gravity.CENTER_VERTICAL);return l;}
    private GradientDrawable bg(int c,int r){GradientDrawable g=new GradientDrawable();g.setColor(c);g.setCornerRadius(dp(r));g.setStroke(dp(1),LINE);return g;}
    private Button btn(String s){Button b=new Button(this);b.setText(s);b.setTextColor(FG);b.setTextSize(12);b.setAllCaps(false);b.setTypeface(Typeface.DEFAULT,Typeface.BOLD);b.setBackground(bg(PANEL,12));return b;}
    private void base(String h,String c){root=col();root.setPadding(dp(18),dp(20),dp(18),dp(18));root.setBackgroundColor(BG);LinearLayout top=row();title=tv(h,24,FG);title.setTypeface(Typeface.DEFAULT,Typeface.BOLD);top.addView(title,new LinearLayout.LayoutParams(0,dp(42),1));score=tv("XP  000",11,ACCENT);top.addView(score);root.addView(top);sub=tv(c,12,MUTED);root.addView(sub,new LinearLayout.LayoutParams(-1,dp(34)));content=col();ScrollView sc=new ScrollView(this);sc.setFillViewport(true);sc.addView(content);root.addView(sc,new LinearLayout.LayoutParams(-1,0,1));nav=row();nav.setPadding(0,dp(12),0,0);root.addView(nav);setContentView(root);}
    private void navButton(String s,String m){Button b=btn(s);b.setOnClickListener(v->{mode=m;if(m.equals("home"))home();else if(m.equals("learn"))learn();else if(m.equals("ielts"))ielts();else demo();});nav.addView(b,new LinearLayout.LayoutParams(0,dp(46),1));}
    private void card(String l,String v,String m){LinearLayout c=col();c.setPadding(dp(15),dp(14),dp(15),dp(14));c.setBackground(bg(PANEL,14));TextView a=tv(l.toUpperCase(),10,MUTED);a.setTypeface(Typeface.DEFAULT,Typeface.BOLD);c.addView(a);TextView x=tv(v,20,FG);x.setTypeface(Typeface.DEFAULT,Typeface.BOLD);c.addView(x,new LinearLayout.LayoutParams(-1,dp(34)));c.addView(tv(m,11,MUTED));content.addView(c,new LinearLayout.LayoutParams(-1,dp(100)));space(10);}
    private void space(int h){Space s=new Space(this);content.addView(s,new LinearLayout.LayoutParams(1,dp(h)));}
    private void seed(){
        String[] lv={"A1","A2","B1","B2","C1","C2"};
        String[][] d={
        {"reading","What is the opposite of “hot”?","cold","cold","warm","fast","bright"},
        {"grammar","She ___ a student.","is","is","are","am","be"},
        {"vocabulary","I ___ breakfast at 8.","have","have","has","do","make"},
        {"grammar","Yesterday I ___ to school.","went","went","go","gone","going"},
        {"reading","A shop opens at 9 and closes at 18. When does it close?","18:00","09:00","12:00","18:00","20:00"},
        {"vocabulary","Which word means “small”?","little","large","little","late","loud"},
        {"grammar","There ___ two books on the table.","are","is","are","am","be"},
        {"listening","“See you tomorrow” means:","tomorrow","today","tomorrow","yesterday","never"},
        {"vocabulary","Choose the natural phrase:","make a mistake","do a mistake","make a mistake","take a mistake","put a mistake"},
        {"reading","Tom is tired, so he goes to bed early. Why?","He is tired.","He is hungry.","He is tired.","He is late.","He is angry"},
        {"grammar","I have lived here ___ 2022.","since","for","since","during","from"},
        {"vocabulary","“Reliable” is closest to:","dependable","dangerous","expensive","temporary","silent"},
        {"grammar","If it rains, we ___ at home.","will stay","stay","will stay","stayed","would stayed"},
        {"reading","The report was postponed because several figures had not been verified. Why?","The figures were unverified.","The figures were unverified.","It was too long.","The office closed.","The figures were deleted."},
        {"vocabulary","“Purchase” is closest to:","buy","sell","borrow","repair","hide"},
        {"grammar","By next June, she ___ here for five years.","will have worked","worked","will work","has worked","will have worked"},
        {"reading","“Please refrain from using the lift during maintenance.” What should people do?","Avoid the lift.","Use it quickly.","Avoid the lift.","Repair it.","Ignore the notice."},
        {"vocabulary","Which collocation is natural?","strong evidence","heavy evidence","strong evidence","big evidence","large evidence"},
        {"grammar","He suggested that the meeting ___ until Friday.","be moved","is moved","be moved","was move","moves"},
        {"writing","Choose the more formal sentence.","I would appreciate your response.","Send me back.","I would appreciate your response.","Tell me now.","Answer me."},
        {"reading","The author implies that the policy may create short-term costs despite long-term gains. What is implied?","Costs may occur initially.","There are no costs.","Costs may occur initially.","Gains are impossible.","The policy failed."},
        {"vocabulary","“Ambiguous” means:","open to more than one interpretation","very clear","open to more than one interpretation","unrelated","impossible"},
        {"grammar","Hardly ___ the announcement when questions began.","had they made","they made","had they made","have they make","they had making"},
        {"writing","Which transition best introduces a contrast?","Nevertheless","Therefore","Nevertheless","For example","Similarly"},
        {"reading","The study does not establish causation, but it identifies a consistent association. What can be concluded?","The variables are associated, not proven causal.","One causes the other.","The variables are associated, not proven causal.","Nothing was observed.","The study proved causation."},
        {"vocabulary","“Scrutinize” most nearly means:","examine closely","ignore","examine closely","summarize briefly","replace"},
        {"grammar","Were the evidence to be stronger, the conclusion ___ more defensible.","would be","will be","would be","is","has been"},
        {"writing","Which thesis is most precise?","This essay examines how urban design influences access to public transport.","Cities are interesting.","This essay examines how urban design influences access to public transport.","Transport is good.","I will talk about cities."},
        {"reading","Which phrase signals a concession?","Granted,","For instance,","Granted,","As a result,","In addition,"},
        {"vocabulary","“Ubiquitous” means:","present almost everywhere","rare","present almost everywhere","temporary","controversial"},
        {"grammar","Not only ___ the proposal costly, but it was also difficult to implement.","was","did","was","has","being"},
        {"writing","Which sentence avoids an unsupported absolute claim?","The evidence suggests the measure can reduce risk in some settings.","It always works.","The evidence suggests the measure can reduce risk in some settings.","Everyone agrees.","It proves everything"}
        };
        int[] counts={5,5,5,5,6,6};int p=0;
        for(int i=0;i<6;i++)for(int j=0;j<counts[i];j++){String[]x=d[p++%d.length];questions.add(new Q(lv[i],x[0],x[1],x[2],x[3],x[4],x[5]));}
        String[] skills={"grammar","vocabulary","reading","listening","writing"};
        for(int li=0;li<6;li++)for(int j=0;j<7;j++){String l=lv[li],prompt,ans;
            if(li==0){prompt="Choose the correct word: “I ___ coffee.”";ans="drink";}
            else if(li==1){prompt="Choose the correct tense: “She ___ yesterday.”";ans="worked";}
            else if(li==2){prompt="Choose the natural collocation: “___ a decision.”";ans="make";}
            else if(li==3){prompt="Complete: “If I had known, I ___ earlier.”";ans="would have acted";}
            else if(li==4){prompt="Which word best fits an academic context?";ans="substantial";}
            else {prompt="Which sentence is most precise and appropriately qualified?";ans="The evidence suggests a limited effect";}
            questions.add(new Q(l,skills[j%skills.length],prompt,ans,ans,li<2?"made a decision":"strongly maybe",li<2?"drinked":"would act","something else"));}}
    private void home(){base("ENGLISH / LAB","Adaptive English learning · CEFR A1 → C2 · IELTS track");card("Current level","A1 → A2","Start easy. The test increases difficulty as you progress.");card("Progress","06 / 36 CHECKPOINTS","Reading · Listening · Writing · Speaking · Grammar · Vocabulary");card("Streak","7 DAYS","Short daily sessions. Accuracy matters more than speed.");LinearLayout c=col();c.setPadding(dp(15),dp(14),dp(15),dp(14));c.setBackground(bg(PANEL,14));c.addView(tv("CEFR LADDER",10,MUTED));LinearLayout r=row();String[]ls={"A1","A2","B1","B2","C1","C2"};for(String l:ls){TextView x=tv(l,11,l.equals("A1")?ACCENT:MUTED);x.setGravity(Gravity.CENTER);x.setBackground(bg(l.equals("A1")?Color.rgb(35,50,20):PANEL,10));r.addView(x,new LinearLayout.LayoutParams(0,dp(42),1));}c.addView(r);content.addView(c,new LinearLayout.LayoutParams(-1,dp(86)));Button b=btn("START ADAPTIVE TEST  →");b.setTextColor(BG);b.setBackground(bg(ACCENT,14));b.setOnClickListener(v->{index=0;correct=0;learn();});content.addView(b,new LinearLayout.LayoutParams(-1,dp(54)));space(10);Button i=btn("IELTS LAB  ·  DIAGNOSTIC →");i.setOnClickListener(v->ielts());content.addView(i,new LinearLayout.LayoutParams(-1,dp(54)));navButton("HOME","home");navButton("LEARN","learn");navButton("IELTS","ielts");navButton("DEMO","demo");}
    private void learn(){if(index>=questions.size()){result();return;}Q q=questions.get(index);base("ADAPTIVE TEST","Question "+(index+1)+" / "+questions.size()+"  ·  "+q.level+"  ·  "+q.skill.toUpperCase());TextView p=tv(q.prompt,22,FG);p.setTypeface(Typeface.DEFAULT,Typeface.BOLD);p.setPadding(0,dp(16),0,dp(20));content.addView(p);for(String o:q.options){Button b=btn(o);b.setGravity(Gravity.START|Gravity.CENTER_VERTICAL);b.setPadding(dp(16),0,dp(10),0);b.setOnClickListener(v->{boolean ok=o.equals(q.answer);if(ok)correct++;Toast.makeText(this,ok?"Correct · +10 XP":"Not quite · keep going",Toast.LENGTH_SHORT).show();index++;learn();});content.addView(b,new LinearLayout.LayoutParams(-1,dp(56)));space(8);}content.addView(tv("Difficulty rises gradually: A1 → A2 → B1 → B2 → C1 → C2",11,MUTED));navButton("HOME","home");navButton("IELTS","ielts");navButton("NOTIFY","demo");}
    private void result(){base("DIAGNOSTIC COMPLETE","Your adaptive path is ready");card("Accuracy",correct+" / "+questions.size(),correct>questions.size()*.8?"Strong foundation":"Keep practising and repeat the diagnostic.");card("Next target","B1","Lessons will focus on the skills with the most missed questions.");Button b=btn("RETAKE FROM A1  ↻");b.setOnClickListener(v->{index=0;correct=0;learn();});content.addView(b,new LinearLayout.LayoutParams(-1,dp(54)));Button i=btn("OPEN IELTS LAB  →");i.setOnClickListener(v->ielts());content.addView(i,new LinearLayout.LayoutParams(-1,dp(54)));navButton("HOME","home");navButton("IELTS","ielts");}
    private void ielts(){base("IELTS / LAB","Original practice · timed modules · band-oriented feedback");card("Target band","7.5","Set your target, then train the weakest skill.");String[]s={"LISTENING","READING","WRITING","SPEAKING"};for(String x:s){LinearLayout r=row();r.setPadding(dp(14),dp(10),dp(10),dp(10));r.setBackground(bg(PANEL,12));TextView a=tv(x,13,FG);a.setTypeface(Typeface.DEFAULT,Typeface.BOLD);r.addView(a,new LinearLayout.LayoutParams(0,dp(52),1));r.addView(tv(x.equals("READING")?"7.0":"6.5",18,ACCENT));content.addView(r);space(7);}Button d=btn("RUN 12-MIN DIAGNOSTIC  →");d.setTextColor(BG);d.setBackground(bg(ACCENT,14));d.setOnClickListener(v->ieltsQuestion());content.addView(d,new LinearLayout.LayoutParams(-1,dp(54)));Button m=btn("FULL MOCK · 2H 45M");m.setOnClickListener(v->ieltsQuestion());content.addView(m,new LinearLayout.LayoutParams(-1,dp(54)));navButton("HOME","home");navButton("LEARN","learn");navButton("DEMO","demo");}
    private void ieltsQuestion(){base("IELTS / READING","01 / 13  ·  TIMER 11:42");TextView p=tv("A city introduced a bicycle-sharing scheme. In its first year, usage increased most sharply near university districts. Which explanation is best supported by the information?",18,FG);p.setTypeface(Typeface.DEFAULT,Typeface.BOLD);p.setPadding(0,dp(16),0,dp(18));content.addView(p);String[]o={"Students made frequent short trips.","Every resident stopped using cars.","The scheme operated only at night.","Universities funded every station."};for(String x:o){Button b=btn(x);b.setGravity(Gravity.START|Gravity.CENTER_VERTICAL);b.setPadding(dp(15),0,0,0);b.setOnClickListener(v->Toast.makeText(this,"Answer recorded · feedback after section",Toast.LENGTH_SHORT).show());content.addView(b,new LinearLayout.LayoutParams(-1,dp(56)));space(8);}content.addView(tv("Original MVMCMD practice content · not copied official IELTS material.",10,MUTED));navButton("IELTS","ielts");navButton("NEXT →","ielts");}
    private void demo(){base("NOTIFICATION / DEMO","See normal, code, call and game-safe notification states");card("NORMAL MESSAGE","Telegram · New message","Soft custom sound + polished native mirror.");Button copy=btn("COPY  4821");copy.setOnClickListener(v->{ClipboardManager cm=(ClipboardManager)getSystemService(Context.CLIPBOARD_SERVICE);cm.setPrimaryClip(ClipData.newPlainText("code","4821"));copy.setText("COPIED  ✓");});content.addView(copy,new LinearLayout.LayoutParams(-1,dp(54)));space(8);LinearLayout call=row();call.setPadding(dp(14),dp(12),dp(12),dp(12));call.setBackground(bg(PANEL,14));LinearLayout cc=col();cc.addView(tv("INCOMING CALL",10,MUTED));cc.addView(tv("Aziza Karimova",18,FG));cc.addView(tv("+998 90 123 45 67",11,MUTED));call.addView(cc,new LinearLayout.LayoutParams(0,dp(80),1));Button no=btn("RED");no.setTextColor(0xffff6575);call.addView(no,new LinearLayout.LayoutParams(dp(70),dp(52)));Button yes=btn("GREEN");yes.setTextColor(ACCENT);call.addView(yes,new LinearLayout.LayoutParams(dp(80),dp(52)));content.addView(call);space(10);LinearLayout safe=col();safe.setPadding(dp(14),dp(14),dp(14),dp(14));safe.setBackground(bg(Color.rgb(10,13,18),14));safe.addView(tv("GAME / VIDEO SAFE MODE",11,MUTED));safe.addView(tv("▁▂▃▅▆▇▆▅▃▂▁",22,ACCENT));safe.addView(tv("Only a 4px rainbow edge signal · no overlay card · no interruption",11,MUTED));content.addView(safe);space(10);Button run=btn("RUN DEMO AGAIN  ↻");run.setOnClickListener(v->Toast.makeText(this,"Demo: message → code → call → safe edge",Toast.LENGTH_LONG).show());content.addView(run,new LinearLayout.LayoutParams(-1,dp(54)));navButton("HOME","home");navButton("LEARN","learn");navButton("IELTS","ielts");}
}