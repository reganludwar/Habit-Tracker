# Archived: the 5-day upper/lower split

> **Status: retired.** In July 2026 the app switched to a **3-day full-body**
> program (Full-Body A/B/C on Mon/Wed/Fri) to better protect muscle during a
> fat-loss phase — 3 hard full-body sessions hit each muscle 2–3×/week with more
> recovery than the old 5-day split, which is the higher-retention choice in a
> calorie deficit. This file preserves the old split verbatim so it can be
> restored if you ever return to a 5-day, higher-frequency, non-deficit block.

## The week (S[] day templates, by day-of-week)

| Day | Tag | Lift |
|-----|-----|------|
| Sun | REST + REVIEW | — |
| Mon | UPPER PUSH | bench, shoulder press, triceps, knee raises |
| Tue | LOWER + RUN | goblet squat, RDL, reverse lunge |
| Wed | UPPER PULL | pull-ups, rows, hammer curl, knee raises |
| Thu | LOWER VAR + RUN | goblet squat, Bulgarian split squat, Pallof press |
| Fri | UPPER MIX | incline bench, chest row, Mike Tyson pushups, side plank |
| Sat | ACTIVE REST | long walk; Zone 2 bike optional |

Week meters graded workouts as **X / 5** with a floor of 2 and a ceiling of 5.

## Workout templates (`WO_TEMPLATES`, keyed by weekday)

```js
mon:{tag:'UPPER PUSH',ex:[
  {name:'DB Bench Press',load:'pb',input:'wr',warmup:true,sets:2,target:[8,15],warmRest:60,workRest:180,seedW:45,seedR:10,restMob:['m2']},
  {name:'Seated Overhead Press',load:'pb',input:'wr',warmup:true,sets:2,target:[8,15],warmRest:60,workRest:180,seedW:25,seedR:10,restMob:['m4']},
  {name:'DB Triceps Extension',load:'pb',input:'wr',warmup:false,sets:2,target:[8,12],workRest:180,seedW:15,seedR:10,restMob:['m3']},
  {name:'Hanging Knee Raise',load:'bw',input:'reps',warmup:false,sets:2,target:[6,12],workRest:60,seedR:10,restMob:[null]}
]},
tue:{tag:'LOWER + RUN',ex:[
  {name:'Goblet Squat',load:'pb',input:'wr',warmup:true,sets:1,target:[8,15],warmRest:120,seedW:50,seedR:10,restMob:[]},
  {name:'DB Romanian Deadlift',load:'pb',input:'wr',warmup:true,sets:2,target:[8,15],warmRest:60,workRest:120,seedW:45,seedR:10,restMob:['m13']},
  {name:'Reverse Lunge',load:'bw',input:'reps',warmup:false,sets:1,target:[8,12],seedR:10,restMob:[]}
]},
wed:{tag:'UPPER PULL',ex:[
  {name:'Pull-Up',load:'bw',input:'reps',warmup:true,sets:2,target:[6,12],warmRest:60,workRest:180,seedR:8,restMob:['m7']},
  {name:'Bent Over DB Row',load:'pb',input:'wr',warmup:false,sets:2,target:[8,15],workRest:180,seedW:40,seedR:10,restMob:['m8']},
  {name:'Preacher Curl',load:'pb',input:'wr',warmup:false,sets:1,target:[8,12],seedW:20,seedR:10,restMob:[]},
  {name:'DB Hammer Curl',load:'pb',input:'wr',warmup:false,sets:2,target:[8,12],workRest:180,seedW:20,seedR:10,restMob:['m17']},
  {name:'Hanging Knee Raise',load:'bw',input:'reps',warmup:false,sets:2,target:[6,12],workRest:60,seedR:10,restMob:[null]}
]},
thu:{tag:'LOWER VAR + RUN',ex:[
  {name:'Goblet Squat',load:'pb',input:'wr',warmup:true,sets:1,target:[8,15],warmRest:120,seedW:50,seedR:10,restMob:[]},
  {name:'Plank',load:'bw',input:'time',warmup:false,sets:1,workRest:60,seedT:45,restMob:[]},
  {name:'Bulgarian Split Squat',load:'bw',input:'reps',warmup:false,sets:1,target:[6,12],seedR:8,restMob:[]}
]},
fri:{tag:'UPPER MIX',ex:[
  {name:'Incline DB Bench',load:'pb',input:'wr',warmup:true,sets:2,target:[8,15],warmRest:60,workRest:180,seedW:40,seedR:10,restMob:['m2']},
  {name:'Pull-Up',load:'bw',input:'reps',warmup:true,sets:2,target:[6,12],warmRest:60,workRest:180,seedR:8,restMob:['m8']},
  {name:'Mike Tyson Pushups',load:'bw',input:'reps',warmup:false,sets:2,target:[8,20],workRest:60,seedR:10,restMob:['m17']},
  {name:'Side Plank',load:'bw',input:'time',warmup:false,sets:2,workRest:60,seedT:35,bil:true,restMob:[null]}
]}
```

## How to restore it

1. In `index.html`, replace the three-key `WO_TEMPLATES` (`fbA`/`fbB`/`fbC`) with
   the five-key block above.
2. Restore `woDayTag` → `{1:'mon',2:'tue',3:'wed',4:'thu',5:'fri'}` and
   `woTagDow` → `{mon:1,tue:2,wed:3,thu:4,fri:5}`, and set `WO_TAGS` back to
   `['mon','tue','wed','thu','fri']`.
3. Restore the five lift days in the `S[]` array (Mon–Fri) and revert Tue/Thu
   from cardio/mobility days back to lift days.
4. Reset the week meters: `wdefs` back to the five Push/Lower/Pull/Lower/Mix
   days and the workout floor/ceiling back to **2 / 5** (`floorBar(st.wo,2,5)`,
   "X / 5 workouts").
