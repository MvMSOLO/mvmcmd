package com.mvmcmd.launcher;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.graphics.Color;
import android.os.Bundle;
import android.os.CountDownTimer;
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

/**
 * MVMCMD English Studio.
 *
 * Offline-first language intelligence layer:
 * - Grammar Checker: deterministic grammar/spelling/clarity corrections + explanations.
 * - English Query Refiner: rewrites rough prompts/questions into natural English.
 * - English Speaking Coach: SpeechRecognizer + fluency feedback loop.
 * - Language Coach: CEFR placement-style diagnostic and daily focus plan.
 * - Bagel-inspired learning pipeline: append-only local events, error clustering, session windows.
 * - KernelCAD-inspired parametric progress compass: a geometric Canvas view generated from the same
 *   CEFR progression model used by the learning engine.
 *
 * No network/API dependency is required for core learning flows.
 */
public class MvmEnglishStudioActivity extends Activity implements TextToSpeech.OnInitListener {
    private static final int BG=Color.rgb(6,8,12), PANEL=Color.rgb(13,17,24), PANEL2=Color.rgb(19,24,33);
    private static final int FG=Color.rgb(244,247,250), MUTED=Color.rgb(145,155,172), LINE=Color.rgb(42,49,62);
    private static final int ACCENT=Color.rgb(188,255,78), BLUE=Color.rgb(91,181,255), RED=Color.rgb(255,105,125);
    private static final String[] LEVELS={"A1","A2","B1","B2","C1","C2"};
    private SharedPreferences prefs;
    private TextToSpeech tts;
    private SpeechRecognizer speech;
    private LinearLayout content;
    private int level, xp, streak, totalCorrect, totalAsked, sessionCorrect, sessionAsked;
    private int checkpointAsked, checkpointCorrect;
    private String lastStudyDay="";
    private int grammarErrors, vocabErrors, fluencyErrors, clarityErrors;
    private String lastSpeech="";
    private CountDownTimer timer;

    private static class Item {
        String level, skill, prompt, answer;
        String[] options;
        Item(String l,String s,String p,String a,String...o){level=l;skill=s;prompt=p;answer=a;options=o;}
    }

    private static class Word {
        String level,word,meaning,example;
        Word(String l,String w,String m,String e){level=l;word=w;meaning=m;example=e;}
    }
    private final ArrayList<Word> words=new ArrayList<>();


    private static class OQ {
        String prompt,audio; String[] options; int correct;
        OQ(String p,String a,String...o){prompt=p;audio=a;options=o;correct=0;}
    }
    private final ArrayList<Item> items=new ArrayList<>();
    private boolean fullMock=false;

    private String[] four(String a,String b,String c,String d){return new String[]{a,b,c,d};}

    private ArrayList<OQ> objectiveBank(String name){
        ArrayList<OQ> out=new ArrayList<>();
        if("LISTENING".equals(name)){
            String[] places={"city museum","language centre","sports hall","science library","train station","community theatre","student office","technology fair","public clinic","art gallery"};
            String[] times={"9:15","10:40","11:25","12:50","14:10","15:35","16:20","17:45","18:05","19:30"};
            String[] prices={"£6","£8","£12","£15","£18","£20","£22","£25","£30","£35"};
            String[] days={"Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday","Tuesday","Thursday","Saturday"};
            String[] nums={"214","326","418","507","612","735","804","921","104","118"};
            String[] actions={"book online","bring photo ID","arrive fifteen minutes early","email the office","use the north entrance","collect a visitor badge","bring a notebook","check the mobile app","call before noon","show the confirmation code"};
            for(int i=0;i<10;i++){
                String place=places[i],time=times[i],price=prices[i],day=days[i],num=nums[i],action=actions[i];
                out.add(new OQ("What time does the "+place+" open?","The "+place+" opens at "+time+".",time,times[(i+1)%10],times[(i+3)%10],times[(i+6)%10]));
                out.add(new OQ("How much does the service cost?","The speaker says the fee is "+price+".",price,prices[(i+2)%10],prices[(i+5)%10],prices[(i+7)%10]));
                out.add(new OQ("On which day is the appointment scheduled?","The appointment is scheduled for "+day+".",day,days[(i+1)%10],days[(i+4)%10],days[(i+6)%10]));
                out.add(new OQ("Which instruction does the speaker give?","The caller is told to "+action+".",action,actions[(i+1)%10],actions[(i+4)%10],actions[(i+7)%10]));
            }
        }else{
            String[] topics={"urban gardens","remote work","public transport","digital textbooks","sleep routines","recycling centres","school libraries","team projects","online shopping","city cycling"};
            String[] mains={
                "The passage argues that small green spaces can improve local wellbeing.",
                "The passage explains that remote work changes how teams organise communication.",
                "The passage examines why reliable buses can influence commuting choices.",
                "The passage compares digital textbooks with printed study materials.",
                "The passage explains how consistent sleep routines support concentration.",
                "The passage describes how local recycling centres sort different materials.",
                "The passage explains why school libraries still matter in a digital environment.",
                "The passage discusses how clear roles improve team projects.",
                "The passage examines why online shoppers value predictable delivery.",
                "The passage describes how protected cycle lanes can change travel habits."
            };
            String[] details={
                "Residents reported using the gardens mainly before dinner.",
                "Teams found that written updates reduced repeated meetings.",
                "Travellers valued predictable arrival times more than extra decoration.",
                "Students liked search functions but still used printed notes for revision.",
                "Participants who kept a fixed bedtime reported fewer late-night distractions.",
                "Glass and paper were processed in different areas.",
                "Students often visited the library for quiet study rather than book borrowing.",
                "Projects were delayed most often when responsibilities were unclear.",
                "Customers were more likely to return when delivery dates were visible.",
                "Commuters mentioned safety as a major reason for changing routes."
            };
            String[] implications={
                "The benefit depends partly on regular community use.",
                "Good remote work still requires deliberate communication.",
                "Reliability can matter as much as speed for everyday travel.",
                "Digital access does not make every printed resource unnecessary.",
                "A routine may matter more than occasional long sleep.",
                "Sorting systems depend on careful separation at the start.",
                "A digital collection does not remove the need for physical study space.",
                "Team structure can affect project speed.",
                "Clear delivery information can influence repeat purchases.",
                "Infrastructure can shape behaviour as well as convenience."
            };
            for(int i=0;i<10;i++){
                String t=topics[i];
                String passage=mains[i]+" "+details[i]+" "+implications[i];
                out.add(new OQ("What is the main idea of the passage about "+t+"?",passage,mains[i],
                    mains[(i+1)%10],details[(i+3)%10],implications[(i+5)%10]));
                out.add(new OQ("Which detail is stated in the passage? ",passage,details[i],
                    details[(i+2)%10],mains[(i+4)%10],implications[(i+6)%10]));
                out.add(new OQ("What can be inferred from the passage? ",passage,implications[i],
                    implications[(i+2)%10],details[(i+5)%10],mains[(i+7)%10]));
                String recommendation="The passage most strongly supports practical planning around "+t+".";
                out.add(new OQ("What does the passage suggest about "+t+"? ",passage,recommendation,
                    "It should be abandoned immediately.","It has no measurable effect.","It is useful only in winter."));
            }
        }
        return out;
    }



    @Override public void onCreate(Bundle b){
        super.onCreate(b);
        prefs=getSharedPreferences("mvm_english_studio",MODE_PRIVATE);
        load();
        seed();
        seedWords();
        tts=new TextToSpeech(this,this);
        if(!SpeechRecognizer.isRecognitionAvailable(this)) speech=null;
        home();
    }

    @Override protected void onDestroy(){
        if(timer!=null) timer.cancel();
        if(tts!=null) tts.shutdown();
        if(speech!=null) speech.destroy();
        super.onDestroy();
    }

    private int dp(int n){return (int)(n*getResources().getDisplayMetrics().density+.5f);}
    private TextView tv(String s,float size,int color){
        TextView t=new TextView(this); t.setText(s); t.setTextColor(color); t.setTextSize(size);
        t.setTypeface(Typeface.DEFAULT); return t;
    }
    private LinearLayout col(){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);return l;}
    private LinearLayout row(){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.HORIZONTAL);l.setGravity(Gravity.CENTER_VERTICAL);return l;}
    private android.graphics.drawable.GradientDrawable box(int color,int radius){
        android.graphics.drawable.GradientDrawable g=new android.graphics.drawable.GradientDrawable();
        g.setColor(color);g.setCornerRadius(dp(radius));g.setStroke(dp(1),LINE);return g;
    }
    private Button button(String s){
        Button b=new Button(this);b.setText(s);b.setTextColor(FG);b.setTextSize(12);b.setAllCaps(false);
        b.setTypeface(Typeface.DEFAULT,Typeface.BOLD);b.setMinHeight(dp(48));b.setBackground(box(PANEL,12));return b;
    }
    private void base(String title,String subtitle){
        ScrollView sc=new ScrollView(this);
        content=col(); content.setPadding(dp(16),dp(12),dp(16),dp(22)); sc.addView(content);
        LinearLayout root=col(); root.setBackgroundColor(BG);
        LinearLayout top=row(); TextView h=tv(title,23,FG);h.setTypeface(Typeface.DEFAULT,Typeface.BOLD);
        top.addView(h,new LinearLayout.LayoutParams(0,dp(44),1));
        TextView xpv=tv(xp+" XP",11,ACCENT);top.addView(xpv);
        root.addView(top);root.addView(tv(subtitle,11,MUTED),new LinearLayout.LayoutParams(-1,dp(30)));
        root.addView(sc,new LinearLayout.LayoutParams(-1,0,1));
        LinearLayout nav=row();nav.setPadding(dp(10),dp(7),dp(10),dp(8));
        addNav(nav,"LAB",v->home());addNav(nav,"PRACTICE",v->practice());addNav(nav,"COACH",v->coach());
        addNav(nav,"IELTS",v->ielts());addNav(nav,"DATA",v->analytics());
        root.addView(nav);setContentView(root);
    }
    private void addNav(LinearLayout nav,String text,View.OnClickListener l){
        Button b=button(text);b.setTextSize(10);b.setOnClickListener(l);nav.addView(b,new LinearLayout.LayoutParams(0,dp(44),1));
    }
    private void gap(int n){Space s=new Space(this);content.addView(s,new LinearLayout.LayoutParams(1,dp(n)));}

    private void load(){
        level=prefs.getInt("level",0);xp=prefs.getInt("xp",0);streak=prefs.getInt("streak",0);
        totalCorrect=prefs.getInt("correct",0);totalAsked=prefs.getInt("asked",0);
        checkpointAsked=prefs.getInt("checkpoint_asked",0);checkpointCorrect=prefs.getInt("checkpoint_correct",0);
        lastStudyDay=prefs.getString("last_day","");
        grammarErrors=prefs.getInt("grammar_errors",0);vocabErrors=prefs.getInt("vocab_errors",0);
        fluencyErrors=prefs.getInt("fluency_errors",0);clarityErrors=prefs.getInt("clarity_errors",0);
    }
    private void save(){
        prefs.edit().putInt("level",level).putInt("xp",xp).putInt("streak",streak)
            .putInt("correct",totalCorrect).putInt("asked",totalAsked).putInt("checkpoint_asked",checkpointAsked).putInt("checkpoint_correct",checkpointCorrect).putString("last_day",lastStudyDay)
            .putInt("grammar_errors",grammarErrors).putInt("vocab_errors",vocabErrors)
            .putInt("fluency_errors",fluencyErrors).putInt("clarity_errors",clarityErrors).apply();
    }
    private void event(String type,String detail){
        String old=prefs.getString("events","");
        String line=System.currentTimeMillis()+"|"+type+"|"+detail.replace("|","/").replace("\n"," ");
        String[] rows=old.isEmpty()?new String[0]:old.split("\n");
        StringBuilder sb=new StringBuilder();
        int start=Math.max(0,rows.length-199);
        for(int i=start;i<rows.length;i++){if(i>start)sb.append("\n");sb.append(rows[i]);}
        if(sb.length()>0)sb.append("\n");sb.append(line);
        prefs.edit().putString("events",sb.toString()).apply();
    }

    private void seedWords(){
        if(!words.isEmpty())return;
        String[][] data={
            {"A1","arrive","to get to a place","We arrive at school at eight."},
            {"A1","borrow","to take and use something temporarily","Can I borrow your pen?"},
            {"A1","choose","to pick one thing","Choose a colour."},
            {"A1","quiet","making little noise","The library is quiet."},
            {"A1","friendly","kind and pleasant","Our teacher is friendly."},
            {"A2","improve","to make something better","I want to improve my English."},
            {"A2","reliable","able to be trusted","She is a reliable teammate."},
            {"A2","avoid","to stay away from something","Try to avoid distractions."},
            {"A2","schedule","a plan of times and activities","Check the study schedule."},
            {"A2","ordinary","normal, not special","It was an ordinary day."},
            {"B1","purchase","to buy something","You can purchase the ticket online."},
            {"B1","evidence","information showing whether something is true","The report contains evidence."},
            {"B1","maintain","to keep something at the same level or condition","Maintain a regular study routine."},
            {"B1","estimate","a rough calculation or judgement","My estimate was close."},
            {"B1","require","to need something","The course requires daily practice."},
            {"B2","ambiguous","open to more than one interpretation","The wording was ambiguous."},
            {"B2","scrutinize","to examine very carefully","Researchers scrutinize the data."},
            {"B2","substantial","large or important","There was a substantial improvement."},
            {"B2","consecutive","following one after another","She studied for five consecutive days."},
            {"B2","coherent","clear and logically connected","His argument was coherent."},
            {"C1","ubiquitous","present or found almost everywhere","Smartphones are ubiquitous."},
            {"C1","concession","an acknowledgement of an opposing point","The essay includes a useful concession."},
            {"C1","cumulative","increasing through successive additions","The cumulative effect was significant."},
            {"C1","mitigate","to make something less severe","The policy may mitigate the risk."},
            {"C1","nuanced","showing subtle distinctions","Her answer was nuanced."},
            {"C2","equivocal","open to multiple interpretations","His response was equivocal."},
            {"C2","incongruous","out of place or inconsistent","The modern sign looked incongruous."},
            {"C2","contingent","dependent on a condition","Approval is contingent on funding."},
            {"C2","salient","most noticeable or important","The report highlights the salient issue."},
            {"C2","corroborate","to confirm with additional evidence","Later data corroborated the finding."}
        };
        for(String[] d:data)words.add(new Word(d[0],d[1],d[2],d[3]));
    }

    private void seed(){
        if(!items.isEmpty())return;
        add("A1","grammar","She ___ a student.","is","is","are","am","be");
        add("A1","grammar","There ___ two books.","are","is","are","am","be");
        add("A1","vocabulary","Opposite of “hot”?","cold","cold","warm","fast","bright");
        add("A1","vocabulary","Choose: I ___ breakfast at 8.","have","have","has","do","make");
        add("A1","reading","The shop closes at 18:00. When does it close?","18:00","09:00","12:00","18:00","20:00");
        add("A1","writing","Type the natural phrase: My name is Alex.","my name is alex","my name is alex","my names is alex","my name are alex","name my is alex");

        add("A2","grammar","Yesterday I ___ to school.","went","went","go","gone","going");
        add("A2","grammar","I have lived here ___ 2022.","since","for","since","during","from");
        add("A2","vocabulary","“Reliable” is closest to:","dependable","dangerous","expensive","dependable","temporary");
        add("A2","vocabulary","Choose the natural phrase:","make a mistake","do a mistake","make a mistake","take a mistake","put a mistake");
        add("A2","reading","Sara missed the bus because she left late. Why?","She left late.","She was ill.","She left late.","The bus broke.","She forgot the route.");
        add("A2","writing","Choose the correct sentence.","I have never seen it.","I never have seen it.","I have never seen it.","I has never see it.","I never seen it.");

        add("B1","grammar","If it rains, we ___ at home.","will stay","stay","will stay","stayed","would stayed");
        add("B1","grammar","By next June, she ___ here for five years.","will have worked","worked","will work","has worked","will have worked");
        add("B1","vocabulary","“Purchase” is closest to:","buy","sell","borrow","repair","hide");
        add("B1","vocabulary","Which collocation is natural?","strong evidence","heavy evidence","strong evidence","big evidence","large evidence");
        add("B1","reading","The new route reduced travel time by 20%, especially for commuters. Who benefited?","Commuters.","Tourists only.","Nobody.","Commuters.","Drivers only.");
        add("B1","writing","Choose the natural sentence.","I would like to ask about the course.","I would like asking about the course.","I would like to ask about the course.","I am like ask about course.","I ask would course.");

        add("B2","grammar","He suggested that the meeting ___ until Friday.","be moved","is moved","be moved","was move","moves");
        add("B2","grammar","Hardly ___ the announcement when questions began.","had they made","they made","had they made","have they make","they had making");
        add("B2","vocabulary","“Ambiguous” means:","open to more than one interpretation","very clear","open to more than one interpretation","unrelated","impossible");
        add("B2","vocabulary","“Scrutinize” means:","examine closely","ignore","examine closely","summarize briefly","replace");
        add("B2","reading","“Promising but unproven” implies:","It has potential but lacks enough evidence.","It definitely works.","It has potential but lacks enough evidence.","It will fail.","It is irrelevant.");
        add("B2","writing","Which transition introduces contrast?","Nevertheless","Therefore","Nevertheless","For example","Similarly");

        add("C1","grammar","Were the evidence stronger, the conclusion ___ more defensible.","would be","will be","would be","is","has been");
        add("C1","grammar","Not only ___ the proposal costly, but it was difficult to implement.","was","did","was","has","being");
        add("C1","vocabulary","“Ubiquitous” means:","present almost everywhere","rare","present almost everywhere","temporary","controversial");
        add("C1","vocabulary","A “concession” in an argument is:","acknowledgement of an opposing point","a conclusion","acknowledgement of an opposing point","a quotation","a definition");
        add("C1","reading","A study finds association but not causation. What is justified?","The variables are associated, not proven causal.","One causes the other.","The variables are associated, not proven causal.","Nothing was observed.","Causation was proved.");
        add("C1","writing","Choose the precise thesis.","This essay examines how urban design influences access to public transport.","Cities are interesting.","This essay examines how urban design influences access to public transport.","Transport is good.","I will talk about cities.");

        add("C2","grammar","Had the committee known earlier, it ___ the timetable.","would have revised","will revise","would have revised","revises","would revised");
        add("C2","grammar","Only after the data had been checked ___ released.","was the report","the report was","was the report","did report","the report is");
        add("C2","vocabulary","“Incongruous” means:","out of place or inconsistent","identical","out of place or inconsistent","extremely common","official");
        add("C2","vocabulary","“Equivocal” means:","open to multiple interpretations","certain","open to multiple interpretations","irrelevant","mechanical");
        add("C2","reading","A caveat narrows rather than negates the central claim. Meaning?","The claim remains, but only within stated limits.","The claim is rejected.","The claim remains, but only within stated limits.","The claim is copied.","The claim is absolute.");
        add("C2","writing","Choose the appropriately qualified sentence.","The evidence suggests the measure may reduce risk in some settings.","It always works.","The evidence suggests the measure may reduce risk in some settings.","Everyone agrees.","It proves everything.");
    }
    private void add(String l,String s,String p,String a,String...o){items.add(new Item(l,s,p,a,o));}
    private ArrayList<Item> pool(){
        ArrayList<Item> p=new ArrayList<>();
        for(Item x:items)if(x.level.equals(LEVELS[level]))p.add(x);
        return p;
    }
    private String weakSkill(){
        int[] values={grammarErrors,vocabErrors,fluencyErrors,clarityErrors};
        int max=0;for(int i=1;i<values.length;i++)if(values[i]>values[max])max=i;
        if(values[max]==0)return "";
        return new String[]{"grammar","vocabulary","speaking","writing"}[max];
    }

    private Item nextItem(){
        ArrayList<Item> p=pool();
        String weak=weakSkill();
        if(!weak.isEmpty()){
            ArrayList<Item> focused=new ArrayList<>();
            for(Item x:p)if(weak.equals(x.skill))focused.add(x);
            if(focused.size()>=2)p=focused;
        }
        return p.get((int)(Math.random()*Math.max(1,p.size())));
    }

    private void recordAnswer(Item q,boolean ok){
        totalAsked++;sessionAsked++;checkpointAsked++;touchStudyDay();
        if(ok){
            totalCorrect++;sessionCorrect++;checkpointCorrect++;xp+=10+level*3;
            event("answer","ok|"+q.level+"|"+q.skill);
        }else{
            event("answer","miss|"+q.level+"|"+q.skill);
            if("grammar".equals(q.skill))grammarErrors++;
            else if("vocabulary".equals(q.skill))vocabErrors++;
            else if("speaking".equals(q.skill))fluencyErrors++;
            else clarityErrors++;
        }
        if(checkpointAsked>=5){
            double rate=checkpointCorrect/5.0;
            if(rate>=.8 && level<5){level++;event("adaptive","level_up="+LEVELS[level]);}
            else if(rate<.4 && level>0){level--;event("adaptive","review="+LEVELS[level]);}
            checkpointAsked=0;checkpointCorrect=0;
        }
        save();
    }

    private void home(){
        base("ENGLISH / STUDIO","Adaptive language engine · grammar · query · speaking · CEFR · IELTS");
        ParametricCompassView compass=new ParametricCompassView(this);
        content.addView(compass,new LinearLayout.LayoutParams(-1,dp(190)));
        addCard("CURRENT LEVEL",LEVELS[level],"Adaptive checkpoint · "+xp+" XP · "+streak+" day streak");
        addCard("LEARNING SIGNAL",totalCorrect+" / "+totalAsked,"Local event pipeline clusters recurring mistakes without uploading text.");
        addCard("COACH FOCUS",focusForErrors(),"The app prioritizes your highest recurring error family.");
        Button p=button("START ADAPTIVE SESSION  →");p.setTextColor(BG);p.setBackground(box(ACCENT,13));p.setOnClickListener(v->practice());content.addView(p);gap(8);
        Button q=button("QUERY REFINER  ·  MAKE MY ENGLISH NATURAL");q.setOnClickListener(v->queryRefiner());content.addView(q);gap(8);
        Button g=button("GRAMMAR CHECKER  ·  EXPLAIN MY MISTAKES");g.setOnClickListener(v->grammarChecker());content.addView(g);gap(8);
        Button s=button("SPEAKING COACH  ·  REAL VOICE LOOP");s.setOnClickListener(v->speakingCoach());content.addView(s);gap(8);
        Button l=button("LANGUAGE COACH  ·  PLACEMENT DIAGNOSTIC");l.setOnClickListener(v->placement());content.addView(l);gap(8);
        Button v=button("VOCABULARY LAB  ·  CEFR FLASHCARDS");v.setOnClickListener(x->vocabularyLab());content.addView(v);
    }

    private void addCard(String a,String b,String c){
        LinearLayout x=col();x.setPadding(dp(13),dp(11),dp(13),dp(11));x.setBackground(box(PANEL,13));
        TextView aa=tv(a,10,MUTED);aa.setTypeface(Typeface.DEFAULT,Typeface.BOLD);x.addView(aa);
        TextView bb=tv(b,19,FG);bb.setTypeface(Typeface.DEFAULT,Typeface.BOLD);x.addView(bb);
        x.addView(tv(c,11,MUTED));content.addView(x,new LinearLayout.LayoutParams(-1,dp(88)));gap(7);
    }
    private String focusForErrors(){
        int m=Math.max(Math.max(grammarErrors,vocabErrors),Math.max(fluencyErrors,clarityErrors));
        if(m==0)return "Balanced — keep exploring.";
        if(m==grammarErrors)return "Grammar";
        if(m==vocabErrors)return "Vocabulary";
        if(m==fluencyErrors)return "Speaking fluency";
        return "Clarity / writing";
    }

    private void practice(){
        final Item q=nextItem();
        base("ADAPTIVE / "+q.level,q.skill.toUpperCase(Locale.ROOT)+" · checkpoint window");
        TextView prompt=tv(q.prompt,20,FG);prompt.setTypeface(Typeface.DEFAULT,Typeface.BOLD);prompt.setPadding(0,dp(12),0,dp(16));content.addView(prompt);
        if("writing".equals(q.skill)){
            EditText e=new EditText(this);e.setTextColor(FG);e.setHintTextColor(MUTED);e.setTextSize(16);e.setHint("Write your answer…");e.setBackground(box(PANEL2,12));content.addView(e,new LinearLayout.LayoutParams(-1,dp(62)));gap(8);
            Button c=button("CHECK WITH GRAMMAR ENGINE");c.setOnClickListener(v->{String s=e.getText().toString().trim().toLowerCase(Locale.ROOT);boolean ok=s.equals(q.answer.toLowerCase(Locale.ROOT));recordAnswer(q,ok);showFeedback(ok,q.answer,ok?"Correct.":"Try the natural sentence shown below.");});content.addView(c);
        }else{
            for(String o:q.options){Button b=button(o);b.setGravity(Gravity.START|Gravity.CENTER_VERTICAL);b.setPadding(dp(14),0,0,0);b.setOnClickListener(v->{boolean ok=o.equals(q.answer);recordAnswer(q,ok);showFeedback(ok,q.answer,ok?"Correct.":"Review the explanation and try another item.");});content.addView(b,new LinearLayout.LayoutParams(-1,dp(55)));gap(6);}
        }
        TextView hint=tv("Adaptive rule: repeated misses create a focused review queue. Strong sessions increase difficulty.",11,MUTED);content.addView(hint);
    }

    private void showFeedback(boolean ok,String answer,String note){
        String msg=(ok?"✓  ":"↻  ")+note+"\nTarget: "+answer+"\nFocus: "+focusForErrors();
        new android.app.AlertDialog.Builder(this).setTitle(ok?"GOOD SIGNAL":"REVIEW SIGNAL").setMessage(msg).setPositiveButton("CONTINUE",null).show();
    }

    private void grammarChecker(){
        base("GRAMMAR / CHECKER","Deterministic proofreader: grammar · spelling · word choice · clarity");
        EditText input=editor("Paste or type English here…");content.addView(input,new LinearLayout.LayoutParams(-1,dp(150)));gap(8);
        Button check=button("CHECK EVERYTHING  →");check.setTextColor(BG);check.setBackground(box(ACCENT,12));check.setOnClickListener(v->{
            GrammarResult r=checkGrammar(input.getText().toString());showGrammarResult(r);
        });content.addView(check);gap(8);
        content.addView(tv("The engine separates clear errors from style suggestions and teaches the rule instead of silently rewriting.",11,MUTED));
    }

    private EditText editor(String hint){
        EditText e=new EditText(this);e.setTextColor(FG);e.setHintTextColor(MUTED);e.setTextSize(16);e.setGravity(Gravity.TOP);e.setHint(hint);
        e.setPadding(dp(14),dp(12),dp(14),dp(12));e.setBackground(box(PANEL2,12));return e;
    }

    private static class GrammarResult {String corrected;ArrayList<String> changes=new ArrayList<>();int score;}
    private GrammarResult checkGrammar(String raw){
        GrammarResult r=new GrammarResult();
        String s=raw==null?"":raw.trim(); r.corrected=s;
        if(s.isEmpty()){r.score=0;return r;}
        String x=s.replaceAll("\\s+"," ").trim();

        String[][] rules={
            {"\\bi am agree\\b","I agree","Use “I agree”, not “I am agree.”"},
            {"\\bdiscuss about\\b","discuss","“Discuss” does not need “about”."},
            {"\\bmake a photo\\b","take a photo","The natural collocation is “take a photo.”"},
            {"\\bmore easier\\b","easier","Avoid double comparatives."},
            {"\\bmore better\\b","better","Use one comparative form."},
            {"\\bpeoples\\b","people","“People” is already plural."},
            {"\\badvice(s)?\\b","advice","“Advice” is normally uncountable."},
            {"\\binformations\\b","information","“Information” is normally uncountable."},
            {"\\bhe go\\b","he goes","Third-person singular needs -s in the present simple."},
            {"\\bshe go\\b","she goes","Third-person singular needs -s in the present simple."},
            {"\\bpeople is\\b","people are","“People” takes the plural verb “are.”"},
            {"\\bthey was\\b","they were","Use “were” with they."},
            {"\\bhe don't\\b","he doesn't","Use “doesn't” with he/she/it."},
            {"\\bshe don't\\b","she doesn't","Use “doesn't” with he/she/it."},
            {"\\bi has\\b","I have","Use “have” with I."},
            {"\\bi didn't went\\b","I didn't go","After “didn't”, use the base verb."},
            {"\\byesterday I go\\b","yesterday I went","A completed past action needs the past form."},
            {"\\bmany money\\b","a lot of money","“Money” is uncountable in this meaning."},
            {"\\bdepend of\\b","depend on","The natural preposition is “depend on.”"},
            {"\\binterested on\\b","interested in","The natural preposition is “interested in.”"},
            {"\\bgood in\\b","good at","Use “good at” for skills."},
            {"\\bmarried with\\b","married to","The usual construction is “married to.”"},
            {"\\bin Monday\\b","on Monday","Days normally use “on.”"},
            {"\\bin the weekend\\b","at the weekend","“At the weekend” is standard in British English; “on the weekend” is also common in American English."}
        };

        for(String[] rule:rules){
            String before=x; x=x.replaceAll("(?i)"+rule[0],rule[1]);
            if(!before.equals(x)) r.changes.add(before+"  →  "+x+"\\n"+rule[2]);
        }

        if(x.matches(".*\\bi\\b.*")){
            String before=x; x=x.replaceAll("\\bi\\b","I");
            if(!before.equals(x)) r.changes.add("Capitalized the pronoun “I”.\\nThe first-person pronoun is always capitalized.");
        }
        String spacing=x; x=x.replaceAll(" {2,}"," ");
        if(!spacing.equals(x)) r.changes.add("Removed repeated spaces.\\nUse one space between words.");

        if(!x.matches(".*[.!?]$")){
            x+=".";
            r.changes.add("Added final punctuation.\\nComplete sentences normally end with punctuation.");
        }
        if(x.length()>0)x=Character.toUpperCase(x.charAt(0))+x.substring(1);

        r.corrected=x;
        r.score=Math.max(1,100-r.changes.size()*9);
        event("grammar_check","changes="+r.changes.size()+"|score="+r.score);
        return r;
    }

    private void showGrammarResult(GrammarResult r){
        LinearLayout box=col();box.setPadding(dp(12),dp(12),dp(12),dp(12));box.setBackground(this.box(PANEL,12));
        box.addView(tv("CORRECTED",10,MUTED));TextView c=tv(r.corrected,17,FG);c.setTypeface(Typeface.DEFAULT,Typeface.BOLD);box.addView(c);content.addView(box,new LinearLayout.LayoutParams(-1,-2));gap(9);
        addCard("CORRECTNESS ESTIMATE",r.score+" / 100",r.changes.size()+" rule-level changes detected.");
        for(String change:r.changes){TextView t=tv("• "+change,12,FG);t.setPadding(0,dp(5),0,dp(5));content.addView(t);}
        if(r.changes.isEmpty())content.addView(tv("No high-confidence errors detected. Optional polish is a style choice.",12,ACCENT));
    }

    private void queryRefiner(){
        base("QUERY / REFINER","Turn rough English into clear, natural questions without changing your intent.");
        EditText input=editor("e.g. “how make app learn english better”");content.addView(input,new LinearLayout.LayoutParams(-1,dp(120)));gap(8);
        Button refine=button("REFINE MY QUERY  →");refine.setTextColor(BG);refine.setBackground(box(ACCENT,12));refine.setOnClickListener(v->{
            String raw=input.getText().toString().trim();String refined=refineQuery(raw);
            showRefined(raw,refined);
        });content.addView(refine);gap(9);
        content.addView(tv("Three outputs: natural wording · intent preserved · one stronger version for precise answers.",11,MUTED));
    }

    private String refineQuery(String raw){
        if(raw==null||raw.trim().isEmpty())return "Please enter a question or request.";
        String x=raw.trim().replaceAll("\\s+"," ");
        x=x.replaceAll("(?i)^how make ","How can I make ");
        x=x.replaceAll("(?i)^how do make ","How can I make ");
        x=x.replaceAll("(?i)^how use ","How can I use ");
        x=x.replaceAll("(?i)^how i ","How can I ");
        x=x.replaceAll("(?i)^what is best ","What is the best ");
        x=x.replaceAll("(?i)^which is best ","Which is the best ");
        x=x.replaceAll("(?i)^give me ","Could you give me ");
        x=x.replaceAll("(?i)^i want know ","I want to know ");
        x=x.replaceAll("(?i)^tell me how ","Could you explain how ");
        x=x.replaceAll("(?i)\\\benglish learning app\\\b","English-learning app");
        x=x.replaceAll("(?i)\\\bmake website\\\b","build a website");
        x=x.replaceAll("(?i)\\\bmake app\\\b","build an app");
        x=x.replaceAll("(?i)\\\bmore better\\\b","better");
        if(x.matches(".*\\?$")) x=x.substring(0,x.length()-1);
        if(!x.matches(".*[.!?]$")) x+="?";
        if(x.endsWith("??"))x=x.substring(0,x.length()-1);
        if(Character.isLowerCase(x.charAt(0)))x=Character.toUpperCase(x.charAt(0))+x.substring(1);
        return x;
    }
    private void showRefined(String raw,String refined){
        addCard("ORIGINAL",raw,"Intent preserved.");
        addCard("NATURAL ENGLISH",refined,"Grammar + word choice + sentence structure normalized.");
        addCard("PRECISION FRAME","Context → Goal → Constraints → Output","Add these four blocks when you want a stronger answer.");
        String boosted=refined.endsWith("?")
            ? refined.substring(0,refined.length()-1)+" Include the relevant context, constraints, and desired output format?"
            : refined+" Include the relevant context, constraints, and desired output format?";
        addCard("PRECISION BOOST",boosted,"Turns a vague request into a testable instruction.");
        event("query_refine","len="+raw.length());
    }

    private void coach(){
        base("COACH / CONTROL ROOM","Choose the right coach instead of doing random drills.");
        addCard("TOP ERROR CLUSTER",focusForErrors(),"Built from local event windows.");
        Button g=button("GRAMMAR COACH");g.setOnClickListener(v->grammarChecker());content.addView(g);gap(7);
        Button q=button("QUERY / NATURAL ENGLISH COACH");q.setOnClickListener(v->queryRefiner());content.addView(q);gap(7);
        Button s=button("SPEAKING / FLUENCY COACH");s.setOnClickListener(v->speakingCoach());content.addView(s);gap(7);
        Button p=button("PLACEMENT / CEFR COACH");p.setOnClickListener(v->placement());content.addView(p);gap(7);
        Button d=button("DAILY 12-MINUTE PLAN");d.setOnClickListener(v->dailyPlan());content.addView(d);gap(7);
        Button v=button("VOCABULARY LAB");v.setOnClickListener(x->vocabularyLab());content.addView(v);
    }

    private void vocabularyLab(){
        base("VOCABULARY / LAB","CEFR flashcards · meaning · example · active recall.");
        ArrayList<Word> pool=new ArrayList<>();
        for(Word w:words)if(w.level.equals(LEVELS[level]))pool.add(w);
        final int[] i={0},known={0};
        final LinearLayout card=col();content.addView(card);
        final Runnable[] render={null};
        render[0]=()->{
            card.removeAllViews();
            if(i[0]>=pool.size()){
                int pct=known[0]*100/Math.max(1,pool.size());
                xp+=known[0]*3;touchStudyDay();save();
                event("vocabulary","known="+known[0]+"/"+pool.size());
                addCard("DECK COMPLETE",known[0]+"/"+pool.size()+" known",pct+"% recall signal · XP updated.");
                Button again=button("REPLAY DECK");again.setOnClickListener(v->vocabularyLab());content.addView(again);
                return;
            }
            Word w=pool.get(i[0]);
            TextView word=tv(w.word,30,ACCENT);word.setTypeface(Typeface.DEFAULT,Typeface.BOLD);word.setGravity(Gravity.CENTER);
            card.addView(word,new LinearLayout.LayoutParams(-1,dp(68)));
            LinearLayout m=col();m.setPadding(dp(13),dp(11),dp(13),dp(11));m.setBackground(box(PANEL,12));
            m.addView(tv("MEANING  ·  "+w.level,10,MUTED));
            TextView meaning=tv(w.meaning,18,FG);meaning.setTypeface(Typeface.DEFAULT,Typeface.BOLD);m.addView(meaning);
            m.addView(tv("EXAMPLE: "+w.example,12,MUTED));
            card.addView(m,new LinearLayout.LayoutParams(-1,-2));gap(8);
            Button knew=button("✓ I KNEW IT");knew.setOnClickListener(v->{known[0]++;i[0]++;render[0].run();});card.addView(knew);gap(7);
            Button review=button("↻ NEEDS REVIEW");review.setOnClickListener(v->{event("vocab_miss",w.word+"|"+w.level);i[0]++;render[0].run();});card.addView(review);
        };
        render[0].run();
    }

    private void dailyPlan(){
        base("DAILY / 12 MIN","A compact session generated from your current signal.");
        String f=focusForErrors();
        addCard("04 MIN",f,"Repair the highest recurring error.");
        addCard("03 MIN","Vocabulary","Learn 5 useful words and one collocation.");
        addCard("03 MIN","Speaking","Answer one open question for 60–90 seconds.");
        addCard("02 MIN","Reflection","Rewrite one sentence naturally.");
        event("daily_plan","focus="+f);
    }

    private void placement(){
        base("PLACEMENT / CEFR","Language Coach-inspired diagnostic: short, adaptive, local.");
        final int[] score={0};final int[] i={0};
        final ArrayList<Item> test=new ArrayList<>(Arrays.asList(
            new Item("A1","grammar","She ___ from Uzbekistan.","is","is","are","am","be"),
            new Item("A2","grammar","I have lived here ___ 2022.","since","for","since","during","from"),
            new Item("B1","grammar","If I had time, I ___ more.","would read","will read","would read","read","am reading"),
            new Item("B2","vocabulary","“Ambiguous” means:","open to more than one interpretation","very clear","open to more than one interpretation","temporary","irrelevant"),
            new Item("C1","grammar","Not only ___ costly, but it was difficult to implement.","was it","it was","was it","is it","being"),
            new Item("C2","vocabulary","“Equivocal” most nearly means:","open to multiple interpretations","certain","open to multiple interpretations","mechanical","official")
        ));
        TextView prompt=tv(test.get(0).prompt,19,FG);prompt.setTypeface(Typeface.DEFAULT,Typeface.BOLD);content.addView(prompt);gap(8);
        LinearLayout answers=col();content.addView(answers);
        final Runnable[] render={null};
        render[0]=()->{
            answers.removeAllViews();Item q=test.get(i[0]);prompt.setText(q.prompt);
            for(String o:q.options){Button b=button(o);b.setOnClickListener(v->{if(o.equals(q.answer))score[0]++;i[0]++;if(i[0]>=test.size()){int inferred=score[0];level=Math.min(5,Math.max(0,inferred));xp+=30;save();event("placement","score="+score[0]);new android.app.AlertDialog.Builder(this).setTitle("PLACEMENT COMPLETE").setMessage("Diagnostic signal: "+LEVELS[level]+"\nCorrect: "+score[0]+"/"+test.size()+"\nThis is a practice estimate, not an official CEFR certificate.").setPositiveButton("OPEN LAB", (d,w)->home()).show();        }else render[0].run();});answers.addView(b);gap(5);}
        };
        render[0].run();
    }

    private void speakingCoach(){
        base("SPEAKING / COACH","SpeechRecognizer loop · fluency · clarity · useful corrections.");
        addCard("TODAY'S PROMPT","Tell me about a project you are proud of.","Aim for 45–90 seconds. Do not memorize a script.");
        Button start=button("● START SPEAKING");start.setTextColor(BG);start.setBackground(box(ACCENT,12));start.setOnClickListener(v->startSpeech(start));content.addView(start);gap(8);
        content.addView(tv("Text alone cannot judge accent or pronunciation. This coach evaluates the recognized transcript for fluency signals and gives practice feedback.",11,MUTED));
        if(!lastSpeech.isEmpty()){gap(12);addCard("LAST TRANSCRIPT",lastSpeech,"Use the Grammar Checker to polish it, then speak again.");}
    }

    private void startSpeech(Button b){
        if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},71);return;
        }
        if(speech==null){Toast.makeText(this,"Speech recognition is unavailable on this device.",Toast.LENGTH_LONG).show();return;}
        b.setText("LISTENING…");b.setEnabled(false);
        Intent i=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);i.putExtra(RecognizerIntent.EXTRA_LANGUAGE,Locale.US.toLanguageTag());
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS,true);
        speech.setRecognitionListener(new RecognitionListener(){
            public void onReadyForSpeech(Bundle p){}
            public void onBeginningOfSpeech(){}
            public void onRmsChanged(float r){}
            public void onBufferReceived(byte[] b){}
            public void onEndOfSpeech(){}
            public void onError(int e){b.setEnabled(true);b.setText("● START AGAIN");Toast.makeText(MvmEnglishStudioActivity.this,"No clear speech result. Try again.",Toast.LENGTH_SHORT).show();}
            public void onResults(Bundle r){ArrayList<String> a=r.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);b.setEnabled(true);b.setText("● SPEAK AGAIN");if(a!=null&&!a.isEmpty())evaluateSpeech(a.get(0));}
            public void onPartialResults(Bundle p){}
            public void onEvent(int x,Bundle p){}
        });
        speech.startListening(i);
    }

    private int evaluateSpeechScore(String text){
        int words=text==null||text.trim().isEmpty()?0:text.trim().split("\\s+").length;
        int fillers=countWords(text,"um","uh","like","you know");int longWords=countLongWords(text);
        int connectors=countWords(text,"because","however","although","for example","as a result","on the other hand");
        int sentenceSignals=countSentences(text);
        return Math.min(100,Math.max(0,45+Math.min(25,words)+Math.min(12,longWords)+Math.min(12,connectors*2)+Math.min(8,sentenceSignals)-fillers*5));
    }

    private int countSentences(String s){if(s==null||s.trim().isEmpty())return 0;return s.trim().split("[.!?]+").length;}

    private void evaluateSpeech(String text){
        lastSpeech=text;int words=text.trim().isEmpty()?0:text.trim().split("\\s+").length;
        int fillers=countWords(text,"um","uh","like","you know");int longWords=countLongWords(text);
        int score=evaluateSpeechScore(text);
        if(fillers>=2)fluencyErrors++; if(words<12)clarityErrors++;
        totalAsked++;save();event("speaking","words="+words+"|fillers="+fillers+"|score="+score);
        String feedback=score>=80?"Strong fluency signal. Add one example and one reason next time.":score>=65?"Good start. Connect ideas with because, however, for example, or as a result.":"Try longer connected sentences. Give an answer + reason + example.";
        new android.app.AlertDialog.Builder(this).setTitle("SPEAKING FEEDBACK").setMessage("Transcript:\n"+text+"\n\nPractice score: "+score+"/100\n\n"+feedback+"\n\nPronunciation/accent are not scored from text alone.").setPositiveButton("AGAIN",null).show();
        speakingCoach();
    }
    private int countWords(String s,String...terms){int n=0;String x=s.toLowerCase(Locale.ROOT);for(String t:terms){String[] a=x.split("\\\b"+java.util.regex.Pattern.quote(t)+"\\\b");n+=Math.max(0,a.length-1);}return n;}
    private int countLongWords(String s){int n=0;for(String w:s.split("\\s+"))if(w.replaceAll("[^A-Za-z]","").length()>=7)n++;return n;}

    private int savedBand(String skill){return prefs.getInt("band_"+skill.toLowerCase(Locale.ROOT),0);}
    private String overallBand(){
        int[] b={savedBand("listening"),savedBand("reading"),savedBand("writing"),savedBand("speaking")};
        int sum=0,n=0;for(int x:b)if(x>0){sum+=x;n++;}
        if(n<4)return "—";
        double avg=sum/4.0;return String.format(Locale.US,"%.1f",Math.round(avg*2.0)/2.0);
    }

    private void ielts(){
        base("IELTS / LAB","Four-skill practice engine · local estimates · practice mapping.");
        addCard("OVERALL PRACTICE BAND",overallBand(),"Saved Listening · Reading · Writing · Speaking signals.");
        addCard("LISTENING","40 questions · 30 min · TTS audio","40 unique local practice items; band signal saved.");
        addCard("READING","40 questions · 60 min","40 unique local practice items; band signal saved.");
        addCard("WRITING","Task 1 + Task 2 · 60 min","Four-criteria practice heuristic; not official marking.");
        addCard("SPEAKING","Part 1 + Part 2 + Part 3 · ~11–14 min","Transcript-based practice; pronunciation is not automatically graded.");
        Button mock=button("START FULL MOCK  →");mock.setTextColor(BG);mock.setBackground(box(ACCENT,12));mock.setOnClickListener(v->ieltsMock());content.addView(mock);gap(8);
        Button w=button("WRITING TASK 1 + TASK 2");w.setOnClickListener(v->ieltsWriting());content.addView(w);gap(7);
        Button s=button("SPEAKING PART 1–3");s.setOnClickListener(v->ieltsSpeaking());content.addView(s);gap(7);
        Button l=button("LISTENING PRACTICE");l.setOnClickListener(v->objective("LISTENING",40,30));content.addView(l);gap(7);
        Button r=button("READING PRACTICE");r.setOnClickListener(v->objective("READING",40,60));content.addView(r);
    }

    private int bandFromPercent(int pct){
        if(pct>=95)return 9;
        if(pct>=90)return 8;
        if(pct>=82)return 7;
        if(pct>=74)return 6;
        if(pct>=66)return 5;
        if(pct>=58)return 4;
        if(pct>=50)return 3;
        if(pct>=40)return 2;
        return 1;
    }
    private void saveIeltsBand(String skill,int band){
        prefs.edit().putInt("band_"+skill.toLowerCase(Locale.ROOT),band).apply();
    }

    private void objective(String name,int count,int minutes){
        base("IELTS / "+name,name+" simulation · "+count+" questions · "+minutes+" minute timer");
        final ArrayList<OQ> bank=objectiveBank(name);
        final int total=Math.min(count,bank.size());
        final int[] n={0},correct={0};
        final TextView qv=tv("",18,FG);qv.setTypeface(Typeface.DEFAULT,Typeface.BOLD);content.addView(qv);gap(8);
        final TextView timerText=tv("",13,ACCENT);content.addView(timerText);gap(8);
        final LinearLayout answers=col();content.addView(answers);
        final CountDownTimer[] ct={null};
        final Runnable[] render={null};

        render[0]=()->{
            answers.removeAllViews();
            if(n[0]>=total){
                if(ct[0]!=null)ct[0].cancel();
                int pct=correct[0]*100/Math.max(1,total);
                int band=bandFromPercent(pct);
                saveIeltsBand(name,band);
                event("ielts_"+name,"correct="+correct[0]+"/"+total+"|band="+band);
                if(fullMock && "LISTENING".equals(name)){new android.app.AlertDialog.Builder(this).setTitle("LISTENING COMPLETE").setMessage("Practice band signal: "+band+"\\nStarting Reading next.").setPositiveButton("CONTINUE",(d,w)->objective("READING",40,60)).show();return;}
                if(fullMock && "READING".equals(name)){new android.app.AlertDialog.Builder(this).setTitle("READING COMPLETE").setMessage("Practice band signal: "+band+"\\nStarting Writing next.").setPositiveButton("CONTINUE",(d,w)->ieltsWriting(true)).show();return;}
                new android.app.AlertDialog.Builder(this).setTitle(name+" COMPLETE")
                    .setMessage("Practice result: "+correct[0]+"/"+total+" ("+pct+"%)\\nEstimated practice band: "+band+"\\nThis is a local simulation, not an official IELTS result.")
                    .setPositiveButton("DONE",(d,w)->ielts()).show();
                return;
            }
            OQ q=bank.get(n[0]);
            qv.setText((n[0]+1)+"/"+total+"  ·  "+q.prompt);
            if("LISTENING".equals(name)){
                Button play=button("▶ PLAY AUDIO");
                play.setTextColor(BG);play.setBackground(box(ACCENT,11));
                play.setOnClickListener(v->speak(q.audio));
                answers.addView(play,new LinearLayout.LayoutParams(-1,dp(48)));
                gap(7);
            }
            int rotation=n[0]%4;
            for(int j=0;j<4;j++){
                final int original=(j+rotation)%4;
                Button b=button(q.options[original]);
                final boolean ok=(original==q.correct);
                b.setOnClickListener(v->{if(ok)correct[0]++;n[0]++;render[0].run();});
                answers.addView(b,new LinearLayout.LayoutParams(-1,dp(50)));
                Space sp=new Space(this);answers.addView(sp,new LinearLayout.LayoutParams(1,dp(5)));
            }
        };

        ct[0]=new CountDownTimer(minutes*60L*1000L,1000L){
            public void onTick(long ms){timerText.setText("TIME "+(ms/60000)+":"+String.format(Locale.US,"%02d",(ms/1000)%60));}
            public void onFinish(){timerText.setText("TIME 0:00");n[0]=total;render[0].run();}
        }.start();
        render[0].run();
    }

    private void ieltsWriting(){ieltsWriting(false);}

    private int writingBand(String text,int target){
        String s=text==null?"":text.trim();
        int words=s.isEmpty()?0:s.split("\\s+").length;
        int paragraphs=Math.max(1,s.split("\\n\\s*\\n").length);
        int connectors=countWords(s,"however","therefore","because","although","moreover","for example","in contrast","as a result");
        int longWords=countLongWords(s);
        int grammar=checkGrammar(s).score;
        int tr=words>=target?7:(words*7/Math.max(1,target));
        tr=Math.min(9,Math.max(1,tr));
        int cc=Math.min(9,Math.max(1,4+paragraphs/2+Math.min(3,connectors/2)));
        int lr=Math.min(9,Math.max(1,4+Math.min(4,longWords/8)));
        int gra=Math.min(9,Math.max(1,3+grammar/25));
        double avg=(tr+cc+lr+gra)/4.0;
        return Math.max(1,Math.min(9,(int)Math.round(avg)));
    }

    private void ieltsWriting(boolean fromMock){
        base("IELTS / WRITING","Task 1 + Task 2 · 20 + 40 minute targets · four-criteria practice signal.");
        addCard("TASK 1","Describe a chart, table, process or map in at least 150 words.","Target: 20 minutes.");
        EditText t1=editor("Task 1 response…");content.addView(t1,new LinearLayout.LayoutParams(-1,dp(175)));gap(8);
        addCard("TASK 2","Write an essay response in at least 250 words.","Target: 40 minutes.");
        EditText t2=editor("Task 2 response…");content.addView(t2,new LinearLayout.LayoutParams(-1,dp(220)));gap(8);
        Button check=button("ANALYZE FOUR CRITERIA  →");check.setTextColor(BG);check.setBackground(box(ACCENT,12));
        check.setOnClickListener(v->{
            String a=t1.getText().toString(),b=t2.getText().toString();
            int s1=writingBand(a,150),s2=writingBand(b,250);
            int band=(s1+s2+1)/2;
            saveIeltsBand("writing",band);
            String msg="Task 1 practice band: "+s1+"/9\\nTask 2 practice band: "+s2+"/9\\nCombined writing signal: "+band+"/9\\n\\nSignals approximate Task Response, Coherence/Cohesion, Lexical Resource and Grammar.\\nThis is NOT an official IELTS band score.";
            event("ielts_writing","t1="+s1+"|t2="+s2+"|band="+band);
            new android.app.AlertDialog.Builder(this).setTitle("WRITING PRACTICE SIGNAL").setMessage(msg)
                .setPositiveButton(fromMock?"START SPEAKING":"OK",(d,w)->{if(fromMock){fullMock=false;ieltsSpeaking();}})
                .setNegativeButton("BACK",null).show();
        });
        content.addView(check);
    }

    private int writingScore(String s,int target){
        int words=s.trim().isEmpty()?0:s.trim().split("\\s+").length;int paragraphs=s.split("\\n\\s*\\n").length;
        int connectors=countWords(s,"however","therefore","because","although","moreover","for example","in contrast");
        int longWords=countLongWords(s);int score=35+Math.min(30,words*30/Math.max(1,target))+Math.min(15,paragraphs*4)+Math.min(15,longWords/3)+Math.min(10,connectors*2);
        return Math.min(100,score);
    }

    private void ieltsSpeaking(){
        base("IELTS / SPEAKING","Three-part speaking lab · transcript coach · practice band signal.");
        addCard("PART 1","Familiar-topic questions.","Target: 4–5 minutes total.");
        Button p1=button("START PART 1  ·  FAMILIAR TOPICS");p1.setOnClickListener(v->startSpeakingPart(1));content.addView(p1);gap(7);
        addCard("PART 2","One cue card · extended turn.","Target: up to 2 minutes.");
        Button p2=button("START PART 2  ·  CUE CARD");p2.setOnClickListener(v->startSpeakingPart(2));content.addView(p2);gap(7);
        addCard("PART 3","Deeper discussion, reasons and examples.","Target: 4–5 minutes total.");
        Button p3=button("START PART 3  ·  DISCUSSION");p3.setOnClickListener(v->startSpeakingPart(3));content.addView(p3);gap(8);
        content.addView(tv("Pronunciation and accent are not scored from transcript text alone.",11,MUTED));
    }

    private void startSpeakingPart(int part){
        base("IELTS / SPEAKING / PART "+part,"Speak naturally. The app evaluates transcript-level fluency signals only.");
        String prompt;
        long duration;
        if(part==1){prompt="What do you usually do when you have free time? Give reasons and an example.";duration=240;}
        else if(part==2){prompt="Describe a project, skill or achievement you are proud of. Say what it was, what you did, and why it mattered.";duration=120;}
        else{prompt="Do you think technology has improved the way people learn? Discuss both benefits and possible drawbacks.";duration=300;}
        addCard("PROMPT",prompt,part==2?"Use a 1-minute preparation idea, then speak for up to 2 minutes.":"Develop your answer with a reason, example and consequence.");
        TextView countdown=tv("TIME "+(duration/60)+":00",14,ACCENT);content.addView(countdown);gap(8);
        Button start=button("● START RECORDING");start.setTextColor(BG);start.setBackground(box(ACCENT,12));
        start.setOnClickListener(v->startSpeechWindow(start,countdown,prompt,duration,part));
        content.addView(start);gap(8);
        content.addView(tv("Your recognized transcript will be reused by Grammar Coach for language feedback.",11,MUTED));
    }

    private void startSpeechWindow(Button b,TextView countdown,String prompt,long seconds,int part){
        if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},71);return;
        }
        if(speech==null){Toast.makeText(this,"Speech recognition is unavailable on this device.",Toast.LENGTH_LONG).show();return;}
        if(timer!=null)timer.cancel();
        b.setText("LISTENING…");b.setEnabled(false);
        timer=new CountDownTimer(seconds*1000L,1000L){
            public void onTick(long ms){countdown.setText("TIME "+(ms/60000)+":"+String.format(Locale.US,"%02d",(ms/1000)%60));}
            public void onFinish(){countdown.setText("TIME 0:00");try{speech.stopListening();}catch(Exception ignored){}}
        }.start();
        Intent i=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE,Locale.US.toLanguageTag());
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS,true);
        speech.setRecognitionListener(new RecognitionListener(){
            public void onReadyForSpeech(Bundle p){}
            public void onBeginningOfSpeech(){}
            public void onRmsChanged(float r){}
            public void onBufferReceived(byte[] b){}
            public void onEndOfSpeech(){}
            public void onError(int e){if(timer!=null)timer.cancel();b.setEnabled(true);b.setText("● TRY AGAIN");Toast.makeText(MvmEnglishStudioActivity.this,"No clear speech result. Try again.",Toast.LENGTH_SHORT).show();}
            public void onResults(Bundle r){
                if(timer!=null)timer.cancel();
                b.setEnabled(true);b.setText("● RECORD AGAIN");
                ArrayList<String> a=r.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if(a!=null&&!a.isEmpty()) evaluateSpeakingPart(a.get(0),part,prompt);
            }
            public void onPartialResults(Bundle p){}
            public void onEvent(int x,Bundle p){}
        });
        speech.startListening(i);
    }

    private void evaluateSpeakingPart(String text,int part,String prompt){
        int score=evaluateSpeechScore(text);
        int band=score>=92?9:score>=85?8:score>=75?7:score>=65?6:score>=55?5:score>=45?4:score>=35?3:score>=25?2:1;
        saveIeltsBand("speaking",band);
        event("ielts_speaking","part="+part+"|band="+band+"|score="+score);
        new android.app.AlertDialog.Builder(this)
            .setTitle("PART "+part+" FEEDBACK")
            .setMessage("Practice band signal: "+band+"\\nTranscript:\\n"+text+"\\n\\nFocus: fluency, connected ideas, lexical range and grammar signals.\\nPronunciation/accent are not scored from text alone.")
            .setPositiveButton(part<3?"NEXT PART":"DONE",(d,w)->{if(part<3)startSpeakingPart(part+1);else ielts();})
            .show();
    }

    private void ieltsMock(){
        new android.app.AlertDialog.Builder(this).setTitle("FULL MOCK")
            .setMessage("The local mock runs Listening → Reading → Writing → Speaking.\\n\\nIt is a practice simulation with local heuristic feedback; it does not produce an official IELTS result.")
            .setPositiveButton("START LISTENING",(d,w)->{fullMock=true;objective("LISTENING",40,30);})
            .setNegativeButton("CANCEL",null).show();
    }

    private void analytics(){
        base("DATA / LEARNING PIPELINE","Bagel-inspired local event windows: collect → cluster → recommend → replay.");
        addCard("EVENTS","Last 200 learning events","Only local metadata is stored: skill, result, counts and timestamps.");
        addCard("GRAMMAR ERRORS",String.valueOf(grammarErrors),"Repeated grammar misses trigger Grammar Coach.");
        addCard("VOCABULARY ERRORS",String.valueOf(vocabErrors),"Repeated word/collocation misses trigger Vocabulary review.");
        addCard("FLUENCY SIGNALS",String.valueOf(fluencyErrors),"Speech transcript patterns, not pronunciation claims.");
        addCard("CLARITY SIGNALS",String.valueOf(clarityErrors),"Writing/query structure feedback.");
        Button clear=button("RESET LEARNING DATA");clear.setOnClickListener(v->{prefs.edit().clear().apply();load();home();});content.addView(clear);
    }

    private void speak(String text){if(tts!=null)tts.speak(text,TextToSpeech.QUEUE_FLUSH,null,"mvm_en");}

    @Override public void onInit(int status){if(status==TextToSpeech.SUCCESS&&tts!=null)tts.setLanguage(Locale.US);}

    private class ParametricCompassView extends View {
        Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);
        public ParametricCompassView(Activity c){super(c);setBackgroundColor(BG);}
        @Override protected void onDraw(Canvas c){
            super.onDraw(c);float cx=getWidth()/2f,cy=getHeight()/2f;float max=Math.min(getWidth(),getHeight())*.39f;
            p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(dp(1));p.setColor(LINE);
            for(int i=1;i<=6;i++)c.drawCircle(cx,cy,max*i/6f,p);
            p.setColor(ACCENT);p.setStrokeWidth(dp(3));c.drawCircle(cx,cy,max*(level+1)/6f,p);
            p.setStyle(Paint.Style.FILL);p.setColor(ACCENT);c.drawCircle(cx,cy,dp(7),p);
            p.setTextAlign(Paint.Align.CENTER);p.setTypeface(Typeface.DEFAULT_BOLD);p.setTextSize(dp(11));
            for(int i=0;i<6;i++){double a=-Math.PI/2+i*Math.PI*2/6;float x=cx+(float)Math.cos(a)*max*.93f;float y=cy+(float)Math.sin(a)*max*.93f;p.setColor(i<=level?ACCENT:MUTED);c.drawText(LEVELS[i],x,y,p);}
            p.setColor(FG);p.setTextSize(dp(9));c.drawText("PARAMETRIC CEFR COMPASS",cx,dp(16),p);
            p.setColor(MUTED);p.setTextSize(dp(8));c.drawText("practice geometry · adaptive state",cx,getHeight()-dp(9),p);
        }
    }
}
