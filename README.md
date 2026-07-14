# Journey OS

تطبيق عربي RTL لطلاب ثالثة ثانوي يحوّل رحلة الـ 52 أسبوعًا إلى نظام دراسة مقسم إلى صفحات حقيقية بدل صفحة واحدة مزدحمة.

## الصفحات

- `index.html` — مركز القيادة والمؤشرات الأساسية.
- `pages/timeline.html` — خريطة رحلة 52 أسبوع.
- `pages/planner.html` — التخطيط الأسبوعي.
- `pages/missions.html` — مهام XP اليومية.
- `pages/focus.html` — غرفة التركيز وPomodoro.
- `pages/insights.html` — التحليل الذكي.
- `pages/wellbeing.html` — الطاقة والعادات.

## التشغيل

```bash
python3 -m http.server 4173
```

ثم افتح `http://127.0.0.1:4173`.

## الفحص

```bash
npm test
```
