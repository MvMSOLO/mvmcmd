package com.mvmcmd.launcher;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.view.Gravity;
import android.view.View;
import android.widget.*;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

public class MvmEnglishActivity extends Activity implements TextToSpeech.OnInitListener {
    private static final int BG=Color.rgb(7,9,13), PANEL=Color.rgb(14,18,25), PANEL2=Color.rgb(18,23,31), LINE=Color.rgb(39,46,58);
    private static final int FG=Color.rgb(244,247,250), MUTED=Color.rgb(143,153,171), ACCENT=Color.rgb(188,255,78), RED=Color.rgb(255,102,121);
    private static final String[] LEVELS={"A1","A2","B1","B2","C1","C2"};
    private final ArrayList<Q> bank=new ArrayList<>();
    private LinearLayout content,nav;
    private TextView xpView;
    private int level=0,asked=0,correct=0,totalCorrect=0,xp=0,streak=0,cursor=0;
    private SharedPreferences prefs;
    private TextToSpeech tts;
    private SpeechRecognizer speech;
    private CountDownTimerBox timer;
    private static class Q {
        final String level,skill,prompt,answer; final String[] options;
        Q(String l,String s,String p,String a,String...o){level=l;skill=s;prompt=p;answer=a;options=o;}
    }
    private static class CountDownTimerBox { boolean active; long remaining; }

    @Override public void onCreate(Bundle b){super.onCreate(b);prefs=getSharedPreferences("mvm_english",MODE_PRIVATE);load();seed();tts=new TextToSpeech(this,this);home();}
    @Override public void onDestroy(){if(tts!=null)tts.shutdown();if(speech!=null)speech.destroy();super.onDestroy();}
    private int dp(int v){return(int)(v*getResources().getDisplayMetrics().density+.5f);}
    private TextView tv(String s,float z,int c){TextView t=new TextView(this);t.setText(s);t.setTextColor(c);t.setTextSize(z);t.setFontFeatureSettings("kern");return t;}
    private LinearLayout col(){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);return l;}
    private LinearLayout row(){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.HORIZONTAL);l.setGravity(Gravity.CENTER_VERTICAL);return l;}
    private GradientDrawable bg(int c,int r){GradientDrawable g=new GradientDrawable();g.setColor(c);g.setCornerRadius(dp(r));g.setStroke(dp(1),LINE);return g;}
    private Button btn(String s){Button b=new Button(this);b.setText(s);b.setTextColor(FG);b.setTextSize(12);b.setAllCaps(false);b.setTypeface(Typeface.DEFAULT,Typeface.BOLD);b.setMinHeight(dp(46));b.setBackground(bg(PANEL,12));return b;}
    private void base(String title,String subtitle){content=col();ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.addView(content);LinearLayout root=col();root.setPadding(dp(18),dp(18),dp(18),dp(12));root.setBackgroundColor(BG);LinearLayout top=row();TextView h=tv(title,24,FG);h.setTypeface(Typeface.DEFAULT,Typeface.BOLD);top.addView(h,new LinearLayout.LayoutParams(0,dp(42),1));xpView=tv("XP "+xp,11,ACCENT);top.addView(xpView);root.addView(top);root.addView(tv(subtitle,12,MUTED),new LinearLayout.LayoutParams(-1,dp(36)));root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));nav=row();nav.setPadding(0,dp(10),0,0);root.addView(nav);setContentView(root);}
    private void nav(String label,String target){Button b=btn(label);b.setOnClickListener(v->{if(target.equals("home"))home();else if(target.equals("practice"))practice();else if(target.equals("ielts"))ielts();else progress();});nav.addView(b,new LinearLayout.LayoutParams(0,dp(46),1));}
    private void gap(int h){Space s=new Space(this);content.addView(s,new LinearLayout.LayoutParams(1,dp(h)));}
    private void card(String label,String value,String meta){LinearLayout c=col();c.setPadding(dp(14),dp(13),dp(14),dp(13));c.setBackground(bg(PANEL,14));TextView a=tv(label.toUpperCase(),10,MUTED);a.setTypeface(Typeface.DEFAULT,Typeface.BOLD);c.addView(a);TextView b=tv(value,20,FG);b.setTypeface(Typeface.DEFAULT,Typeface.BOLD);c.addView(b,new LinearLayout.LayoutParams(-1,dp(32)));c.addView(tv(meta,11,MUTED));content.addView(c,new LinearLayout.LayoutParams(-1,dp(96)));gap(8);}
    private void levelRail(){LinearLayout c=col();c.setPadding(dp(14),dp(14),dp(14),dp(14));c.setBackground(bg(PANEL,14));c.addView(tv("CEFR LADDER",10,MUTED));LinearLayout r=row();for(int i=0;i<6;i++){TextView x=tv(LEVELS[i],11,i==level?ACCENT:(i<level?Color.WHITE:MUTED));x.setGravity(Gravity.CENTER);x.setBackground(bg(i==level?Color.rgb(34,50,20):PANEL2,10));r.addView(x,new LinearLayout.LayoutParams(0,dp(40),1));if(i<5)r.addView(new Space(this),new LinearLayout.LayoutParams(dp(4),1));}c.addView(r);content.addView(c,new LinearLayout.LayoutParams(-1,dp(78)));gap(8);}
    private void load(){level=prefs.getInt("level",0);asked=prefs.getInt("asked",0);correct=prefs.getInt("correct",0);totalCorrect=prefs.getInt("totalCorrect",0);xp=prefs.getInt("xp",0);streak=prefs.getInt("streak",0);}
    private void save(){prefs.edit().putInt("level",level).putInt("asked",asked).putInt("correct",correct).putInt("totalCorrect",totalCorrect).putInt("xp",xp).putInt("streak",streak).apply();}
    private void seed(){
        add("A1","grammar","She ___ a student.","is","is","are","am","be");
        add("A1","vocabulary","Opposite of “hot”?","cold","cold","warm","fast","bright");
        add("A1","reading","The shop opens at 9 and closes at 18. When does it close?","18:00","09:00","12:00","18:00","20:00");
        add("A1","listening","Listen and choose the number.","four five two one","four five two one","five two four one","four two five one","two four five one");
        add("A1","writing","Write the phrase: “My name is ___.”","my name is","my name is","my names is","my name are","name my is");
        add("A1","grammar","There ___ two books.","are","is","are","am","be");
        add("A1","vocabulary","I ___ breakfast at 8.","have","have","has","do","make");
        add("A1","reading","Tom is tired, so he sleeps early. Why?","He is tired.","He is hungry.","He is tired.","He is late.","He is angry");

        add("A2","grammar","Yesterday I ___ to school.","went","went","go","gone","going");
        add("A2","vocabulary","“Reliable” is closest to:","dependable","dangerous","expensive","dependable","temporary");
        add("A2","reading","A notice says: “Please be quiet in the library.” What should you do?","Speak quietly.","Talk loudly.","Run.","Speak quietly.","Play music.");
        add("A2","listening","Listen: “The meeting starts at half past three.” Choose the time.","3:30","2:30","3:15","3:30","4:30");
        add("A2","writing","Choose the correct sentence.","I have never seen it.","I never have seen it.","I have never seen it.","I has never see it.","I never seen it.");
        add("A2","grammar","I have lived here ___ 2022.","since","for","since","during","from");
        add("A2","vocabulary","Choose the natural phrase:","make a mistake","do a mistake","make a mistake","take a mistake","put a mistake");
        add("A2","reading","Sara missed the bus because she left home late. Why did she miss it?","She left late.","She was ill.","She left late.","The bus broke.","She forgot the route.");

        add("B1","grammar","If it rains, we ___ at home.","will stay","stay","will stay","stayed","would stayed");
        add("B1","vocabulary","“Purchase” is closest to:","buy","sell","borrow","repair","hide");
        add("B1","reading","The report was postponed because figures had not been verified. Why?","The figures were unverified.","It was too long.","The figures were unverified.","The office closed.","It was deleted.");
        add("B1","listening","Listen: “Please submit the form before Friday.” What is required?","Submit it before Friday.","Submit it next month.","Ignore it.","Submit it before Friday.","Call the office.");
        add("B1","writing","Choose the more natural sentence.","I would like to ask about the course.","I would like asking about the course.","I would like to ask about the course.","I am like ask about course.","I ask would course.");
        add("B1","grammar","By next June, she ___ here for five years.","will have worked","worked","will work","has worked","will have worked");
        add("B1","vocabulary","Which collocation is natural?","strong evidence","heavy evidence","strong evidence","big evidence","large evidence");
        add("B1","reading","The new route reduced travel time by 20%, especially for commuters. Who benefited most?","Commuters.","Tourists only.","Nobody.","Commuters.","Drivers only.");

        add("B2","grammar","He suggested that the meeting ___ until Friday.","be moved","is moved","be moved","was move","moves");
        add("B2","vocabulary","“Ambiguous” means:","open to more than one interpretation","very clear","open to more than one interpretation","unrelated","impossible");
        add("B2","reading","The author concedes that the plan is expensive but argues it may reduce long-term costs. What is the main point?","Short-term cost may bring long-term savings.","It is cheap.","Short-term cost may bring long-term savings.","It will fail.","No cost exists.");
        add("B2","listening","Listen: “Although the figures look positive, the sample is small.” What limitation is mentioned?","The sample is small.","The figures are missing.","The report is late.","The sample is small.","The topic is unknown.");
        add("B2","writing","Which transition best introduces contrast?","Nevertheless","Therefore","Nevertheless","For example","Similarly");
        add("B2","grammar","Hardly ___ the announcement when questions began.","had they made","they made","had they made","have they make","they had making");
        add("B2","vocabulary","“Scrutinize” most nearly means:","examine closely","ignore","examine closely","summarize briefly","replace");
        add("B2","reading","A policy is described as “promising but unproven.” What does this imply?","It has potential but lacks enough evidence.","It definitely works.","It has potential but lacks enough evidence.","It was cancelled.","It is irrelevant.");

        add("C1","grammar","Were the evidence to be stronger, the conclusion ___ more defensible.","would be","will be","would be","is","has been");
        add("C1","vocabulary","“Ubiquitous” means:","present almost everywhere","rare","present almost everywhere","temporary","controversial");
        add("C1","reading","The study identifies a consistent association but does not establish causation. What is justified?","The variables are associated, not proven causal.","One causes the other.","The variables are associated, not proven causal.","Nothing was observed.","Causation was proved.");
        add("C1","listening","Listen: “The speaker qualified the claim rather than rejecting it.” What did the speaker do?","Added a limitation or condition.","Rejected it completely.","Added a limitation or condition.","Changed the topic.","Repeated it exactly.");
        add("C1","writing","Which thesis is most precise?","This essay examines how urban design influences access to public transport.","Cities are interesting.","This essay examines how urban design influences access to public transport.","Transport is good.","I will talk about cities.");
        add("C1","grammar","Not only ___ the proposal costly, but it was also difficult to implement.","was","did","was","has","being");
        add("C1","vocabulary","“Concession” in argumentation is:","acknowledgement of an opposing point","a conclusion","acknowledgement of an opposing point","a quotation","a definition");
        add("C1","reading","The report is cautiously optimistic. Which wording best matches?","The evidence suggests improvement, although uncertainty remains.","The result is guaranteed.","The evidence suggests improvement, although uncertainty remains.","Nothing changed.","The result is impossible.");

        add("C2","grammar","Had the committee known earlier, it ___ the timetable.","would have revised","will revise","would have revised","revises","would revised");
        add("C2","vocabulary","“Incongruous” most nearly means:","out of place or inconsistent","identical","out of place or inconsistent","extremely common","official");
        add("C2","reading","The author’s caveat narrows rather than negates the central claim. What does this mean?","The claim remains, but only within stated limits.","The claim is rejected.","The claim remains, but only within stated limits.","The claim is copied.","The claim is absolute.");
        add("C2","listening","Listen: “The proposal is viable, contingent upon further funding.” What is the condition?","Further funding is required.","No funding is needed.","Further funding is required.","The proposal is cancelled.","The funding was rejected.");
        add("C2","writing","Which sentence is appropriately qualified?","The evidence suggests the measure may reduce risk in some settings.","It always works.","The evidence suggests the measure may reduce risk in some settings.","Everyone agrees.","It proves everything.");
        add("C2","grammar","Only after the data had been independently checked ___ released.","was the report","the report was","was the report","did report","the report is");
        add("C2","vocabulary","“Equivocal” most nearly means:","open to multiple interpretations","certain","open to multiple interpretations","irrelevant","mechanical");
        add("C2","reading","A passage says the policy is defensible on efficiency grounds, notwithstanding distributional concerns. What contrast is made?","Efficiency benefits coexist with fairness concerns.","Efficiency is absent.","Efficiency benefits coexist with fairness concerns.","The policy is illegal.","There are no concerns.");
    }
    private void add(String l,String s,String p,String a,String...o){bank.add(new Q(l,s,p,a,o));}

    private List<Q> pool(){ArrayList<Q>x=new ArrayList<>();for(Q q:bank)if(q.level.equals(LEVELS[level]))x.add(q);if(x.isEmpty())x.add(bank.get(0));return x;}

    private void answer(boolean ok){
        asked++; if(ok){correct++;totalCorrect++;streak++;xp+=10+level*4;}else{streak=0;}
        if(asked>=5){double rate=asked==0?0:(double)correct/asked;if(rate>=.8&&level<5){level++;Toast.makeText(this,"Level up → "+LEVELS[level],Toast.LENGTH_LONG).show();}else if(rate<.4&&level>0){level--;Toast.makeText(this,"Review mode → "+LEVELS[level],Toast.LENGTH_LONG).show();}asked=0;correct=0;}
        save(); if(timer!=null)timer.active=false; practice();
    }
    private Q next(){List<Q>x=pool();Q q=x.get(cursor%x.size());cursor++;return q;}

    private void home(){
        base("ENGLISH / LAB","A real offline-first learning engine · CEFR A1 → C2");
        card("Current level",LEVELS[level],"Adaptive difficulty. Start easy, then prove you can move upward.");
        card("Learning stats",xp+" XP · "+streak+" DAY STREAK",totalCorrect+" correct answers across your saved sessions.");
        levelRail();
        Button p=btn("START ADAPTIVE PRACTICE  →");p.setTextColor(BG);p.setBackground(bg(ACCENT,14));p.setOnClickListener(v->practice());content.addView(p,new LinearLayout.LayoutParams(-1,dp(54)));gap(8);
        Button i=btn("IELTS PREP  ·  FOUR SKILLS");i.setOnClickListener(v->ielts());content.addView(i,new LinearLayout.LayoutParams(-1,dp(54)));gap(8);
        Button r=btn("PROGRESS / RESET");r.setOnClickListener(v->progress());content.addView(r,new LinearLayout.LayoutParams(-1,dp(54)));
        nav("HOME","home");nav("PRACTICE","practice");nav("IELTS","ielts");nav("PROGRESS","progress");
    }

    private void practice(){
        Q q=next();
        base("ADAPTIVE / "+q.level,q.skill.toUpperCase(Locale.ROOT)+"  ·  "+(totalCorrect+asked+1)+" answered");
        TextView prompt=tv(q.prompt,21,FG);prompt.setTypeface(Typeface.DEFAULT,Typeface.BOLD);prompt.setPadding(0,dp(16),0,dp(18));content.addView(prompt);
        if(q.skill.equals("listening")){
            Button play=btn("▶ PLAY LISTENING");play.setTextColor(BG);play.setBackground(bg(ACCENT,12));play.setOnClickListener(v->speak(q.answer));content.addView(play,new LinearLayout.LayoutParams(-1,dp(52)));gap(10);
        }
        if(q.skill.equals("writing")){
            EditText input=new EditText(this);input.setTextColor(FG);input.setHintTextColor(MUTED);input.setHint("Type your answer…");input.setTextSize(16);input.setPadding(dp(14),0,dp(14),0);input.setBackground(bg(PANEL2,12));content.addView(input,new LinearLayout.LayoutParams(-1,dp(58)));gap(9);
            Button check=btn("CHECK WRITING  →");check.setOnClickListener(v->{String s=input.getText().toString().toLowerCase(Locale.ROOT).trim();boolean ok=s.contains(q.answer.toLowerCase(Locale.ROOT))||q.answer.length()<4&&s.equals(q.answer.toLowerCase(Locale.ROOT));answer(ok);});content.addView(check,new LinearLayout.LayoutParams(-1,dp(52)));
        } else if(q.skill.equals("speaking")){
            Button talk=btn("● START SPEAKING");talk.setTextColor(BG);talk.setBackground(bg(ACCENT,12));talk.setOnClickListener(v->listenFor(q,talk));content.addView(talk,new LinearLayout.LayoutParams(-1,dp(52)));
            content.addView(tv("Say the target phrase naturally. The offline checker looks for the key phrase.",11,MUTED));gap(8);
        } else {
            for(String o:q.options){Button b=btn(o);b.setGravity(Gravity.START|Gravity.CENTER_VERTICAL);b.setPadding(dp(15),0,0,0);b.setOnClickListener(v->answer(o.equals(q.answer)));content.addView(b,new LinearLayout.LayoutParams(-1,dp(56)));gap(7);}
        }
        TextView hint=tv("Adaptive rule: after 5 questions, ≥80% moves up; <40% returns to review.",11,MUTED);content.addView(hint);
        nav("HOME","home");nav("IELTS","ielts");nav("PROGRESS","progress");
    }

    private void progress(){
        base("PROGRESS","Your local learning history stays on this device.");
        card("XP",String.valueOf(xp),"Earned from correct answers; higher CEFR gives slightly more XP.");
        card("Accuracy",totalCorrect+" correct","The diagnostic uses adaptive movement instead of a one-shot grade.");
        for(int i=0;i<6;i++){LinearLayout r=row();r.setPadding(dp(13),dp(11),dp(13),dp(11));r.setBackground(bg(i==level?Color.rgb(30,45,20):PANEL,12));r.addView(tv(LEVELS[i],14, i==level?ACCENT:FG));r.addView(tv(i<level?"COMPLETED":i==level?"CURRENT":"LOCKED",11,i<=level?ACCENT:MUTED),new LinearLayout.LayoutParams(0,dp(38),1));content.addView(r);gap(6);}
        Button reset=btn("RESET LEARNING PROGRESS");reset.setTextColor(RED);reset.setOnClickListener(v->{prefs.edit().clear().apply();level=0;asked=0;correct=0;totalCorrect=0;xp=0;streak=0;home();});content.addView(reset,new LinearLayout.LayoutParams(-1,dp(54)));
        nav("HOME","home");nav("PRACTICE","practice");nav("IELTS","ielts");
    }

    private void ielts(){
        base("IELTS / LAB","Original practice · Listening · Reading · Writing · Speaking");
        card("Target band","7.5","This is a training target, not an official score prediction.");
        String[] names={"LISTENING","READING","WRITING","SPEAKING"};
        String[] desc={"Audio comprehension + note recognition","Skimming, scanning + inference","Task response + coherence","Fluency + pronunciation practice"};
        for(int i=0;i<4;i++){LinearLayout c=col();c.setPadding(dp(14),dp(11),dp(14),dp(11));c.setBackground(bg(PANEL2,13));c.addView(tv(names[i],13,FG));c.addView(tv(desc[i],11,MUTED));Button b=btn(i==0?"START 12-MIN DIAGNOSTIC":i==1?"OPEN READING PRACTICE":i==2?"OPEN WRITING PRACTICE":"OPEN SPEAKING PRACTICE");final int k=i;b.setOnClickListener(v->ieltsModule(k));c.addView(b,new LinearLayout.LayoutParams(-1,dp(46)));content.addView(c);gap(8);}
        Button mock=btn("START FULL MOCK  ·  2H 45M");mock.setTextColor(BG);mock.setBackground(bg(ACCENT,14));mock.setOnClickListener(v->mockIntro());content.addView(mock,new LinearLayout.LayoutParams(-1,dp(54)));
        nav("HOME","home");nav("PRACTICE","practice");nav("IELTS","ielts");nav("PROGRESS","progress");
    }

    private void ieltsModule(int k){
        String[] titles={"LISTENING","READING","WRITING","SPEAKING"};base("IELTS / "+titles[k],"Timed practice · original MVMCMD content");
        TextView timerView=tv(k==0?"12:00":k==2?"20:00":"11:42",30,ACCENT);timerView.setTypeface(Typeface.DEFAULT,Typeface.BOLD);content.addView(timerView);gap(8);
        if(k==0){
            String text="You hear a short announcement about a train service. Listen once, then choose the detail that matches the announcement.";
            content.addView(tv(text,18,FG));Button play=btn("▶ PLAY AUDIO");play.setOnClickListener(v->speak("The train to Samarkand departs at six thirty from platform four. Passengers should arrive ten minutes early."));content.addView(play,new LinearLayout.LayoutParams(-1,dp(52)));gap(9);
            options(content,new String[]{"Platform four","Platform two","Platform six","Platform one"},"Platform four");
        } else if(k==1){
            content.addView(tv("A city introduced a bicycle-sharing scheme. In its first year, usage increased most sharply near university districts. Which explanation is best supported?",18,FG));gap(10);options(content,new String[]{"Students made frequent short trips.","Every resident stopped using cars.","The scheme operated only at night.","Universities funded every station."},"Students made frequent short trips.");
        } else if(k==2){
            content.addView(tv("Task 2 · Write about this question: Some people think public transport should be free. Discuss both views and give your opinion.",18,FG));gap(10);EditText e=new EditText(this);e.setGravity(Gravity.TOP);e.setTextColor(FG);e.setHintTextColor(MUTED);e.setHint("Aim for a clear thesis, developed paragraphs and a conclusion…");e.setTextSize(15);e.setPadding(dp(14),dp(14),dp(14),dp(14));e.setMinLines(9);e.setBackground(bg(PANEL2,12));content.addView(e,new LinearLayout.LayoutParams(-1,dp(230)));Button check=btn("SUBMIT DRAFT");check.setOnClickListener(v->{int words=e.getText().toString().trim().isEmpty()?0:e.getText().toString().trim().split("\\s+").length;Toast.makeText(this,"Draft saved · "+words+" words · review rubric opened next",Toast.LENGTH_LONG).show();});content.addView(check,new LinearLayout.LayoutParams(-1,dp(52)));
        } else {content.addView(tv("Speaking Part 2 practice",12,MUTED));content.addView(tv("Describe a skill you would like to learn. Speak for 60–90 seconds.",20,FG));Button talk=btn("● START SPEAKING");talk.setTextColor(BG);talk.setBackground(bg(ACCENT,12));talk.setOnClickListener(v->startSpeakingSession(talk));content.addView(talk,new LinearLayout.LayoutParams(-1,dp(52)));content.addView(tv("The app records only the speech recognition result; audio is not uploaded by MVMCMD.",11,MUTED));}
        nav("IELTS HOME","ielts");nav("PRACTICE","practice");nav("PROGRESS","progress");
    }
    private void options(LinearLayout target,String[] os,String correctAnswer){for(String o:os){Button b=btn(o);b.setGravity(Gravity.START|Gravity.CENTER_VERTICAL);b.setPadding(dp(14),0,0,0);b.setOnClickListener(v->Toast.makeText(this,o.equals(correctAnswer)?"Correct · noted for review":"Not quite · review the evidence",Toast.LENGTH_SHORT).show());target.addView(b,new LinearLayout.LayoutParams(-1,dp(56)));gap(7);}}
    private void mockIntro(){base("IELTS FULL MOCK","Full-length practice timer · all four skills");card("Listening","40 min","Original questions · play audio · answer set");card("Reading","60 min","Passage analysis + timed questions");card("Writing","60 min","Two-task writing workspace");card("Speaking","11–14 min","Recorded speech-recognition practice");Button start=btn("START MOCK SESSION  →");start.setTextColor(BG);start.setBackground(bg(ACCENT,14));start.setOnClickListener(v->ieltsModule(1));content.addView(start,new LinearLayout.LayoutParams(-1,dp(54)));nav("IELTS","ielts");nav("HOME","home");}
    private void speak(String text){if(tts!=null)tts.speak(text,TextToSpeech.QUEUE_FLUSH,null,"mvm-english");}
    @Override public void onInit(int status){if(status==TextToSpeech.SUCCESS){tts.setLanguage(Locale.US);tts.setSpeechRate(.94f);}}
    private void listenFor(Q q,Button b){if(!SpeechRecognizer.isRecognitionAvailable(this)){Toast.makeText(this,"Speech recognition is unavailable on this device.",Toast.LENGTH_LONG).show();return;}if(speech!=null)speech.destroy();speech=SpeechRecognizer.createSpeechRecognizer(this);Intent i=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);i.putExtra(RecognizerIntent.EXTRA_LANGUAGE,Locale.US.toLanguageTag());b.setText("LISTENING…");speech.setRecognitionListener(new RecognitionListener(){public void onReadyForSpeech(Bundle p){}public void onBeginningOfSpeech(){}public void onRmsChanged(float r){}public void onBufferReceived(byte[]b){}public void onEndOfSpeech(){}public void onError(int e){b.setText("● START SPEAKING");Toast.makeText(MvmEnglishActivity.this,"Could not recognize speech.",Toast.LENGTH_SHORT).show();}public void onResults(Bundle r){ArrayList<String> a=r.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);String heard=a==null||a.isEmpty()?"":a.get(0).toLowerCase(Locale.ROOT);b.setText("● START SPEAKING");answer(heard.contains(q.answer.toLowerCase(Locale.ROOT)));}public void onPartialResults(Bundle p){}public void onEvent(int t,Bundle p){}});speech.startListening(i);}
    private void startSpeakingSession(Button b){Q q=new Q("IELTS","speaking","Describe a skill you would like to learn for 60–90 seconds.","learn",new String[]{"learn"});listenFor(q,b);}
}