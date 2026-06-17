-- ============================================================
--  Madrasati ERP — demo seed
--  Run AFTER 0001–0005. Creates one school with academic structure and a
--  little sample data so the app is populated on first run.
--  To make YOUR account the super admin, see the final note.
-- ============================================================

do $$
declare
  v_school uuid;
  v_year   uuid;
  v_primary uuid; v_middle uuid;
  v_g1 uuid; v_g2 uuid;
  v_dept_ar uuid; v_dept_math uuid; v_dept_islamic uuid;
  v_class_1a uuid; v_class_1b uuid;
begin
  -- School (idempotent by slug)
  insert into public.schools (name_ar, name_en, slug, slogan_ar, calendar, principal_name)
  values ('مدرسة النجاة النموذجية','Al-Najat Model School','najat','نحو جيلٍ متميّز','hijri','أ. عبدالله الياسين')
  on conflict (slug) do update set name_ar = excluded.name_ar
  returning id into v_school;
  if v_school is null then select id into v_school from public.schools where slug = 'najat'; end if;

  -- Academic year
  insert into public.academic_years (school_id, name, start_date, end_date, is_current)
  values (v_school, '2025/2026', '2025-09-01', '2026-06-30', true)
  on conflict do nothing
  returning id into v_year;
  if v_year is null then select id into v_year from public.academic_years where school_id = v_school and is_current; end if;

  -- Stages
  insert into public.school_stages (school_id, name_ar, name_en, sort_order)
  values (v_school,'المرحلة الابتدائية','Primary',1) returning id into v_primary;
  insert into public.school_stages (school_id, name_ar, name_en, sort_order)
  values (v_school,'المرحلة المتوسطة','Middle',2) returning id into v_middle;

  -- Grade levels
  insert into public.grade_levels (school_id, stage_id, name_ar, name_en, sort_order)
  values (v_school, v_primary, 'الصف الأول','Grade 1',1) returning id into v_g1;
  insert into public.grade_levels (school_id, stage_id, name_ar, name_en, sort_order)
  values (v_school, v_primary, 'الصف الثاني','Grade 2',2) returning id into v_g2;
  insert into public.grade_levels (school_id, stage_id, name_ar, name_en, sort_order)
  values (v_school, v_middle, 'الصف السابع','Grade 7',7);

  -- Departments
  insert into public.departments (school_id, name_ar, name_en) values
    (v_school,'الدراسات الإسلامية','Islamic Studies') returning id into v_dept_islamic;
  insert into public.departments (school_id, name_ar, name_en) values
    (v_school,'اللغة العربية','Arabic') returning id into v_dept_ar;
  insert into public.departments (school_id, name_ar, name_en) values
    (v_school,'الرياضيات','Mathematics') returning id into v_dept_math;
  insert into public.departments (school_id, name_ar, name_en) values
    (v_school,'العلوم','Science'),(v_school,'اللغة الإنجليزية','English'),
    (v_school,'الاجتماعيات','Social Studies'),(v_school,'الحاسوب','Computer Science'),
    (v_school,'التربية البدنية','Physical Education'),(v_school,'التربية الفنية','Art');

  -- Subjects (sample)
  insert into public.subjects (school_id, department_id, name_ar, name_en, code, weekly_periods) values
    (v_school, v_dept_islamic,'القرآن الكريم','Quran','QUR',5),
    (v_school, v_dept_islamic,'التربية الإسلامية','Islamic Studies','ISL',3),
    (v_school, v_dept_ar,'اللغة العربية','Arabic','ARB',6),
    (v_school, v_dept_math,'الرياضيات','Mathematics','MAT',5)
  on conflict do nothing;

  -- Classes
  insert into public.classes (school_id, academic_year_id, grade_level_id, name, capacity)
  values (v_school, v_year, v_g1, '1/أ', 42) returning id into v_class_1a;
  insert into public.classes (school_id, academic_year_id, grade_level_id, name, capacity)
  values (v_school, v_year, v_g1, '1/ب', 42) returning id into v_class_1b;

  -- Sample students
  insert into public.students (school_id, name_ar, name_en, gender, ministry_no, current_class_id, status, guardian_name, guardian_mobile, enrollment_date)
  values
    (v_school,'محمد عبدالله الياسين','Mohammed Alyaseen','male','100245', v_class_1a,'enrolled','عبدالله الياسين','+96599000001','2025-09-01'),
    (v_school,'سارة أحمد المطيري','Sara Almutairi','female','100246', v_class_1a,'enrolled','أحمد المطيري','+96599000002','2025-09-01'),
    (v_school,'يوسف خالد العنزي','Yousef Alenezi','male','100247', v_class_1b,'enrolled','خالد العنزي','+96599000003','2025-09-01')
  on conflict do nothing;

  -- Grade scale (GPA mapping)
  insert into public.grade_scales (school_id, min_pct, max_pct, letter, gpa, label_ar) values
    (v_school, 90, 100, 'A', 4.0, 'ممتاز'),
    (v_school, 80, 89.99, 'B', 3.0, 'جيد جدًا'),
    (v_school, 70, 79.99, 'C', 2.0, 'جيد'),
    (v_school, 60, 69.99, 'D', 1.0, 'مقبول'),
    (v_school, 0, 59.99, 'F', 0.0, 'راسب')
  on conflict do nothing;

  -- Assessment types (weights sum to 100)
  insert into public.assessment_types (school_id, name_ar, name_en, weight, max_score, sort_order) values
    (v_school,'الواجبات','Homework',10,10,1),
    (v_school,'المشاركة','Participation',10,10,2),
    (v_school,'اختبار قصير','Quiz',15,15,3),
    (v_school,'مشروع','Project',15,15,4),
    (v_school,'نصف الفصل','Midterm',20,20,5),
    (v_school,'النهائي','Final',30,30,6)
  on conflict do nothing;

  -- Periods (school day)
  insert into public.periods (school_id, label, start_time, end_time, sort_order) values
    (v_school,'الحصة 1','07:30','08:15',1),
    (v_school,'الحصة 2','08:15','09:00',2),
    (v_school,'الحصة 3','09:00','09:45',3),
    (v_school,'الحصة 4','10:05','10:50',4),
    (v_school,'الحصة 5','10:50','11:35',5),
    (v_school,'الحصة 6','11:35','12:20',6)
  on conflict do nothing;
end $$;

-- Quran surahs (subset — extend to all 114 as needed by the Islamic module)
insert into public.quran_surahs (number, name_ar, ayah_count) values
  (1,'الفاتحة',7),(2,'البقرة',286),(3,'آل عمران',200),(78,'النبأ',40),(79,'النازعات',46),
  (80,'عبس',42),(112,'الإخلاص',4),(113,'الفلق',5),(114,'الناس',6)
on conflict (number) do nothing;

-- ============================================================
--  FINAL STEP — make your account the super admin.
--  1) Create your user:  Authentication → Users → Add user (Auto Confirm).
--  2) Bind it to the school and grant the role:
--
--     update public.profiles
--       set role = 'super_admin',
--           school_id = (select id from public.schools where slug = 'najat')
--     where email = 'a.j.alyaseen@gmail.com';
-- ============================================================
