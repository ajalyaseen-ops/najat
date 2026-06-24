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

-- ============================================================
--  STAFFING PLAN SEED — 2026/2027 (idempotent)
--  Adds the next academic year, Grades 6–9 with 8 classes each (32),
--  department periods-per-class, the full teacher roster with roles, and a
--  constraint-valid period distribution drawn from the school's plan PDF.
--  Per-class cells are auto-balanced from each teacher's planned load and
--  are fully adjustable in the app (Staffing Plan module).
--  Requires 0007_staffing_plan.sql.
-- ============================================================
do $$
declare
  v_school uuid; v_year uuid; v_middle uuid; v_grade uuid;
  v_classes uuid[] := array[]::uuid[];
  v_dept uuid; v_staff uuid;
  v_names text[]; v_teach int[]; v_tags text[];
  v_ci int; v_need int; v_give int; v_rem int; k int;
  v_staff_ids uuid[];
  g record; i int;
begin
  select id into v_school from public.schools where slug = 'najat';
  if v_school is null then raise notice 'najat school not found; skipping staffing seed'; return; end if;

  -- Academic year 2026/2027 (not current; the plan targets next year)
  select id into v_year from public.academic_years where school_id = v_school and name = '2026/2027';
  if v_year is null then
    insert into public.academic_years (school_id, name, start_date, end_date, is_current)
    values (v_school, '2026/2027', '2026-09-01', '2027-06-30', false) returning id into v_year;
  end if;

  select id into v_middle from public.school_stages
    where school_id = v_school and name_ar = 'المرحلة المتوسطة' limit 1;
  if v_middle is null then
    insert into public.school_stages (school_id, name_ar, name_en, sort_order)
    values (v_school, 'المرحلة المتوسطة', 'Middle', 2) returning id into v_middle;
  end if;

  -- Grades 6..9 and 8 classes each, collected (in grade order) into v_classes
  for g in select * from (values
      ('الصف السادس','Grade 6',6,'6'),
      ('الصف السابع','Grade 7',7,'7'),
      ('الصف الثامن','Grade 8',8,'8'),
      ('الصف التاسع','Grade 9',9,'9')
    ) as t(ar,en,ord,pfx) loop
    select id into v_grade from public.grade_levels
      where school_id = v_school and name_ar = g.ar limit 1;
    if v_grade is null then
      insert into public.grade_levels (school_id, stage_id, name_ar, name_en, sort_order)
      values (v_school, v_middle, g.ar, g.en, g.ord) returning id into v_grade;
    end if;
    for i in 1..8 loop
      select id into v_staff from public.classes
        where school_id = v_school and academic_year_id = v_year and name = g.pfx || '/' || i limit 1;
      if v_staff is null then
        insert into public.classes (school_id, academic_year_id, grade_level_id, name, capacity)
        values (v_school, v_year, v_grade, g.pfx || '/' || i, 42) returning id into v_staff;
      end if;
      v_classes := array_append(v_classes, v_staff);
    end loop;
  end loop;

  -- ---- الدراسات الإسلامية (periods/class = 4) ----
  select id into v_dept from public.departments where school_id = v_school and name_ar = 'الدراسات الإسلامية' limit 1;
  if v_dept is not null then
    update public.departments set periods_per_class = 4 where id = v_dept;
    v_names := array['عبدالله جاسم الياسين','حسن سعودي حسن','جعفر أحمد نمر','معلم التربية الإسلامية ٤','معلم التربية الإسلامية ٥','معلم التربية الإسلامية ٦','معلم التربية الإسلامية ٧','معلم التربية الإسلامية ٨'];
    v_teach := array[2,18,18,18,18,18,18,18];
    v_tags  := array['head','','','','','','',''];
    v_staff_ids := array[]::uuid[];
    for k in 1..array_length(v_names,1) loop
      select id into v_staff from public.staff
        where school_id = v_school and department_id = v_dept and name_ar = v_names[k] limit 1;
      if v_staff is null then
        insert into public.staff (school_id, name_ar, department_id, status, nisab, exempt_periods, role_tags)
        values (v_school, v_names[k], v_dept, 'active', 18, greatest(0, 18 - v_teach[k]),
                case when v_tags[k] = '' then '{}'::text[] else string_to_array(v_tags[k], ',') end)
        returning id into v_staff;
      else
        update public.staff set nisab = 18, exempt_periods = greatest(0, 18 - v_teach[k]),
               role_tags = case when v_tags[k] = '' then '{}'::text[] else string_to_array(v_tags[k], ',') end
          where id = v_staff;
      end if;
      v_staff_ids := array_append(v_staff_ids, v_staff);
    end loop;
    -- distribute class-teaching across the 32 classes (split-fill: each class gets exactly 4)
    v_ci := 1; v_need := 4;
    for k in 1..array_length(v_staff_ids,1) loop
      v_rem := v_teach[k];
      while v_rem > 0 and v_ci <= array_length(v_classes,1) loop
        v_give := least(v_need, v_rem);
        insert into public.staffing_allocations (school_id, academic_year_id, department_id, staff_id, class_id, periods)
        values (v_school, v_year, v_dept, v_staff_ids[k], v_classes[v_ci], v_give)
        on conflict (academic_year_id, department_id, staff_id, class_id)
        do update set periods = excluded.periods;
        v_rem := v_rem - v_give; v_need := v_need - v_give;
        if v_need = 0 then v_ci := v_ci + 1; v_need := 4; end if;
      end loop;
    end loop;
    -- point the department head at the tagged head, if any
    update public.departments set head_id = (
      select s.id from public.staff s where s.department_id = v_dept and 'head' = any(s.role_tags) limit 1
    ) where id = v_dept and exists (select 1 from public.staff s where s.department_id = v_dept and 'head' = any(s.role_tags));
  end if;

  -- ---- اللغة العربية (periods/class = 6) ----
  select id into v_dept from public.departments where school_id = v_school and name_ar = 'اللغة العربية' limit 1;
  if v_dept is not null then
    update public.departments set periods_per_class = 6 where id = v_dept;
    v_names := array['وجدي محمد','حسام سيد احمد','علي سعد','أسامة رزق','أحمد فرج','محمود عيد','عبد التواب صابر','فتح الرحمن محمد','محمد حمدان','رجب أحمد','عبدالله رفعت'];
    v_teach := array[12,18,18,18,18,18,18,18,18,18,18];
    v_tags  := array['head','','','','','','','','','',''];
    v_staff_ids := array[]::uuid[];
    for k in 1..array_length(v_names,1) loop
      select id into v_staff from public.staff
        where school_id = v_school and department_id = v_dept and name_ar = v_names[k] limit 1;
      if v_staff is null then
        insert into public.staff (school_id, name_ar, department_id, status, nisab, exempt_periods, role_tags)
        values (v_school, v_names[k], v_dept, 'active', 18, greatest(0, 18 - v_teach[k]),
                case when v_tags[k] = '' then '{}'::text[] else string_to_array(v_tags[k], ',') end)
        returning id into v_staff;
      else
        update public.staff set nisab = 18, exempt_periods = greatest(0, 18 - v_teach[k]),
               role_tags = case when v_tags[k] = '' then '{}'::text[] else string_to_array(v_tags[k], ',') end
          where id = v_staff;
      end if;
      v_staff_ids := array_append(v_staff_ids, v_staff);
    end loop;
    -- distribute class-teaching across the 32 classes (split-fill: each class gets exactly 6)
    v_ci := 1; v_need := 6;
    for k in 1..array_length(v_staff_ids,1) loop
      v_rem := v_teach[k];
      while v_rem > 0 and v_ci <= array_length(v_classes,1) loop
        v_give := least(v_need, v_rem);
        insert into public.staffing_allocations (school_id, academic_year_id, department_id, staff_id, class_id, periods)
        values (v_school, v_year, v_dept, v_staff_ids[k], v_classes[v_ci], v_give)
        on conflict (academic_year_id, department_id, staff_id, class_id)
        do update set periods = excluded.periods;
        v_rem := v_rem - v_give; v_need := v_need - v_give;
        if v_need = 0 then v_ci := v_ci + 1; v_need := 6; end if;
      end loop;
    end loop;
    -- point the department head at the tagged head, if any
    update public.departments set head_id = (
      select s.id from public.staff s where s.department_id = v_dept and 'head' = any(s.role_tags) limit 1
    ) where id = v_dept and exists (select 1 from public.staff s where s.department_id = v_dept and 'head' = any(s.role_tags));
  end if;

  -- ---- اللغة الإنجليزية (periods/class = 6) ----
  select id into v_dept from public.departments where school_id = v_school and name_ar = 'اللغة الإنجليزية' limit 1;
  if v_dept is not null then
    update public.departments set periods_per_class = 6 where id = v_dept;
    v_names := array['حماد بلتاجي','علي عبدالإله','محمد المعداوي','شريف قناوي','محمود سمير','حمادة عزت','طه ربيع','محمد جمال','محمود حمدي','رائد العتيبي','وليد زكي','معلم اللغة الإنجليزية ١٢'];
    v_teach := array[12,18,12,12,18,18,18,18,18,12,18,18];
    v_tags  := array['subject_supervisor,school_assigned','','wing_supervisor','wing_supervisor','','','','','','studies','',''];
    v_staff_ids := array[]::uuid[];
    for k in 1..array_length(v_names,1) loop
      select id into v_staff from public.staff
        where school_id = v_school and department_id = v_dept and name_ar = v_names[k] limit 1;
      if v_staff is null then
        insert into public.staff (school_id, name_ar, department_id, status, nisab, exempt_periods, role_tags)
        values (v_school, v_names[k], v_dept, 'active', 18, greatest(0, 18 - v_teach[k]),
                case when v_tags[k] = '' then '{}'::text[] else string_to_array(v_tags[k], ',') end)
        returning id into v_staff;
      else
        update public.staff set nisab = 18, exempt_periods = greatest(0, 18 - v_teach[k]),
               role_tags = case when v_tags[k] = '' then '{}'::text[] else string_to_array(v_tags[k], ',') end
          where id = v_staff;
      end if;
      v_staff_ids := array_append(v_staff_ids, v_staff);
    end loop;
    -- distribute class-teaching across the 32 classes (split-fill: each class gets exactly 6)
    v_ci := 1; v_need := 6;
    for k in 1..array_length(v_staff_ids,1) loop
      v_rem := v_teach[k];
      while v_rem > 0 and v_ci <= array_length(v_classes,1) loop
        v_give := least(v_need, v_rem);
        insert into public.staffing_allocations (school_id, academic_year_id, department_id, staff_id, class_id, periods)
        values (v_school, v_year, v_dept, v_staff_ids[k], v_classes[v_ci], v_give)
        on conflict (academic_year_id, department_id, staff_id, class_id)
        do update set periods = excluded.periods;
        v_rem := v_rem - v_give; v_need := v_need - v_give;
        if v_need = 0 then v_ci := v_ci + 1; v_need := 6; end if;
      end loop;
    end loop;
    -- point the department head at the tagged head, if any
    update public.departments set head_id = (
      select s.id from public.staff s where s.department_id = v_dept and 'head' = any(s.role_tags) limit 1
    ) where id = v_dept and exists (select 1 from public.staff s where s.department_id = v_dept and 'head' = any(s.role_tags));
  end if;

  -- ---- الرياضيات (periods/class = 5) ----
  select id into v_dept from public.departments where school_id = v_school and name_ar = 'الرياضيات' limit 1;
  if v_dept is not null then
    update public.departments set periods_per_class = 5 where id = v_dept;
    v_names := array['علاء المقدم','ممدوح أبو زيد','وائل محمود','السيد عاشور','هاني حلمي','وليد شوقي','كريم جلال','إبراهيم عبدالله','سعد محمد','مجاهد كامل','محمود قرشي','عبدالله منهل'];
    v_teach := array[10,15,10,10,15,15,15,15,15,15,15,10];
    v_tags  := array['head,studies','','wing_supervisor,studies','wing_supervisor,studies','','','','','','','','studies'];
    v_staff_ids := array[]::uuid[];
    for k in 1..array_length(v_names,1) loop
      select id into v_staff from public.staff
        where school_id = v_school and department_id = v_dept and name_ar = v_names[k] limit 1;
      if v_staff is null then
        insert into public.staff (school_id, name_ar, department_id, status, nisab, exempt_periods, role_tags)
        values (v_school, v_names[k], v_dept, 'active', 18, greatest(0, 18 - v_teach[k]),
                case when v_tags[k] = '' then '{}'::text[] else string_to_array(v_tags[k], ',') end)
        returning id into v_staff;
      else
        update public.staff set nisab = 18, exempt_periods = greatest(0, 18 - v_teach[k]),
               role_tags = case when v_tags[k] = '' then '{}'::text[] else string_to_array(v_tags[k], ',') end
          where id = v_staff;
      end if;
      v_staff_ids := array_append(v_staff_ids, v_staff);
    end loop;
    -- distribute class-teaching across the 32 classes (split-fill: each class gets exactly 5)
    v_ci := 1; v_need := 5;
    for k in 1..array_length(v_staff_ids,1) loop
      v_rem := v_teach[k];
      while v_rem > 0 and v_ci <= array_length(v_classes,1) loop
        v_give := least(v_need, v_rem);
        insert into public.staffing_allocations (school_id, academic_year_id, department_id, staff_id, class_id, periods)
        values (v_school, v_year, v_dept, v_staff_ids[k], v_classes[v_ci], v_give)
        on conflict (academic_year_id, department_id, staff_id, class_id)
        do update set periods = excluded.periods;
        v_rem := v_rem - v_give; v_need := v_need - v_give;
        if v_need = 0 then v_ci := v_ci + 1; v_need := 5; end if;
      end loop;
    end loop;
    -- point the department head at the tagged head, if any
    update public.departments set head_id = (
      select s.id from public.staff s where s.department_id = v_dept and 'head' = any(s.role_tags) limit 1
    ) where id = v_dept and exists (select 1 from public.staff s where s.department_id = v_dept and 'head' = any(s.role_tags));
  end if;

  -- ---- العلوم (periods/class = 4) ----
  select id into v_dept from public.departments where school_id = v_school and name_ar = 'العلوم' limit 1;
  if v_dept is not null then
    update public.departments set periods_per_class = 4 where id = v_dept;
    v_names := array['إسلام سعيد','إسماعيل حجازي','هيثم فتحي','محمد الفاخر','نبراس أحمد','موسى','هيثم عبد الرحمن'];
    v_teach := array[12,20,20,20,20,20,16];
    v_tags  := array['head','','','','','','assistant_supervisor'];
    v_staff_ids := array[]::uuid[];
    for k in 1..array_length(v_names,1) loop
      select id into v_staff from public.staff
        where school_id = v_school and department_id = v_dept and name_ar = v_names[k] limit 1;
      if v_staff is null then
        insert into public.staff (school_id, name_ar, department_id, status, nisab, exempt_periods, role_tags)
        values (v_school, v_names[k], v_dept, 'active', 18, greatest(0, 18 - v_teach[k]),
                case when v_tags[k] = '' then '{}'::text[] else string_to_array(v_tags[k], ',') end)
        returning id into v_staff;
      else
        update public.staff set nisab = 18, exempt_periods = greatest(0, 18 - v_teach[k]),
               role_tags = case when v_tags[k] = '' then '{}'::text[] else string_to_array(v_tags[k], ',') end
          where id = v_staff;
      end if;
      v_staff_ids := array_append(v_staff_ids, v_staff);
    end loop;
    -- distribute class-teaching across the 32 classes (split-fill: each class gets exactly 4)
    v_ci := 1; v_need := 4;
    for k in 1..array_length(v_staff_ids,1) loop
      v_rem := v_teach[k];
      while v_rem > 0 and v_ci <= array_length(v_classes,1) loop
        v_give := least(v_need, v_rem);
        insert into public.staffing_allocations (school_id, academic_year_id, department_id, staff_id, class_id, periods)
        values (v_school, v_year, v_dept, v_staff_ids[k], v_classes[v_ci], v_give)
        on conflict (academic_year_id, department_id, staff_id, class_id)
        do update set periods = excluded.periods;
        v_rem := v_rem - v_give; v_need := v_need - v_give;
        if v_need = 0 then v_ci := v_ci + 1; v_need := 4; end if;
      end loop;
    end loop;
    -- point the department head at the tagged head, if any
    update public.departments set head_id = (
      select s.id from public.staff s where s.department_id = v_dept and 'head' = any(s.role_tags) limit 1
    ) where id = v_dept and exists (select 1 from public.staff s where s.department_id = v_dept and 'head' = any(s.role_tags));
  end if;

  -- ---- الاجتماعيات (periods/class = 2) ----
  select id into v_dept from public.departments where school_id = v_school and name_ar = 'الاجتماعيات' limit 1;
  if v_dept is not null then
    update public.departments set periods_per_class = 2 where id = v_dept;
    v_names := array['عبد العظيم رمضان','خليل محمد','محمود عبد الغني','حمادة فتحي'];
    v_teach := array[16,18,18,12];
    v_tags  := array['subject_supervisor,school_assigned','','','wing_supervisor'];
    v_staff_ids := array[]::uuid[];
    for k in 1..array_length(v_names,1) loop
      select id into v_staff from public.staff
        where school_id = v_school and department_id = v_dept and name_ar = v_names[k] limit 1;
      if v_staff is null then
        insert into public.staff (school_id, name_ar, department_id, status, nisab, exempt_periods, role_tags)
        values (v_school, v_names[k], v_dept, 'active', 18, greatest(0, 18 - v_teach[k]),
                case when v_tags[k] = '' then '{}'::text[] else string_to_array(v_tags[k], ',') end)
        returning id into v_staff;
      else
        update public.staff set nisab = 18, exempt_periods = greatest(0, 18 - v_teach[k]),
               role_tags = case when v_tags[k] = '' then '{}'::text[] else string_to_array(v_tags[k], ',') end
          where id = v_staff;
      end if;
      v_staff_ids := array_append(v_staff_ids, v_staff);
    end loop;
    -- distribute class-teaching across the 32 classes (split-fill: each class gets exactly 2)
    v_ci := 1; v_need := 2;
    for k in 1..array_length(v_staff_ids,1) loop
      v_rem := v_teach[k];
      while v_rem > 0 and v_ci <= array_length(v_classes,1) loop
        v_give := least(v_need, v_rem);
        insert into public.staffing_allocations (school_id, academic_year_id, department_id, staff_id, class_id, periods)
        values (v_school, v_year, v_dept, v_staff_ids[k], v_classes[v_ci], v_give)
        on conflict (academic_year_id, department_id, staff_id, class_id)
        do update set periods = excluded.periods;
        v_rem := v_rem - v_give; v_need := v_need - v_give;
        if v_need = 0 then v_ci := v_ci + 1; v_need := 2; end if;
      end loop;
    end loop;
    -- point the department head at the tagged head, if any
    update public.departments set head_id = (
      select s.id from public.staff s where s.department_id = v_dept and 'head' = any(s.role_tags) limit 1
    ) where id = v_dept and exists (select 1 from public.staff s where s.department_id = v_dept and 'head' = any(s.role_tags));
  end if;

  -- ---- الحاسوب (periods/class = 2) ----
  select id into v_dept from public.departments where school_id = v_school and name_ar = 'الحاسوب' limit 1;
  if v_dept is not null then
    update public.departments set periods_per_class = 2 where id = v_dept;
    v_names := array['حمادة السعيد','عصام','خالد محمد','صالح عاطف'];
    v_teach := array[14,18,14,18];
    v_tags  := array['subject_supervisor,school_assigned,tech_coordinator','','studies',''];
    v_staff_ids := array[]::uuid[];
    for k in 1..array_length(v_names,1) loop
      select id into v_staff from public.staff
        where school_id = v_school and department_id = v_dept and name_ar = v_names[k] limit 1;
      if v_staff is null then
        insert into public.staff (school_id, name_ar, department_id, status, nisab, exempt_periods, role_tags)
        values (v_school, v_names[k], v_dept, 'active', 18, greatest(0, 18 - v_teach[k]),
                case when v_tags[k] = '' then '{}'::text[] else string_to_array(v_tags[k], ',') end)
        returning id into v_staff;
      else
        update public.staff set nisab = 18, exempt_periods = greatest(0, 18 - v_teach[k]),
               role_tags = case when v_tags[k] = '' then '{}'::text[] else string_to_array(v_tags[k], ',') end
          where id = v_staff;
      end if;
      v_staff_ids := array_append(v_staff_ids, v_staff);
    end loop;
    -- distribute class-teaching across the 32 classes (split-fill: each class gets exactly 2)
    v_ci := 1; v_need := 2;
    for k in 1..array_length(v_staff_ids,1) loop
      v_rem := v_teach[k];
      while v_rem > 0 and v_ci <= array_length(v_classes,1) loop
        v_give := least(v_need, v_rem);
        insert into public.staffing_allocations (school_id, academic_year_id, department_id, staff_id, class_id, periods)
        values (v_school, v_year, v_dept, v_staff_ids[k], v_classes[v_ci], v_give)
        on conflict (academic_year_id, department_id, staff_id, class_id)
        do update set periods = excluded.periods;
        v_rem := v_rem - v_give; v_need := v_need - v_give;
        if v_need = 0 then v_ci := v_ci + 1; v_need := 2; end if;
      end loop;
    end loop;
    -- point the department head at the tagged head, if any
    update public.departments set head_id = (
      select s.id from public.staff s where s.department_id = v_dept and 'head' = any(s.role_tags) limit 1
    ) where id = v_dept and exists (select 1 from public.staff s where s.department_id = v_dept and 'head' = any(s.role_tags));
  end if;

  -- ---- التربية الفنية (periods/class = 2) ----
  select id into v_dept from public.departments where school_id = v_school and name_ar = 'التربية الفنية' limit 1;
  if v_dept is not null then
    update public.departments set periods_per_class = 2 where id = v_dept;
    v_names := array['شريف عبد المجيد','سامح كمال','محمد مصطفى','إيهاب محمد'];
    v_teach := array[14,18,18,14];
    v_tags  := array['head','','','wing_supervisor'];
    v_staff_ids := array[]::uuid[];
    for k in 1..array_length(v_names,1) loop
      select id into v_staff from public.staff
        where school_id = v_school and department_id = v_dept and name_ar = v_names[k] limit 1;
      if v_staff is null then
        insert into public.staff (school_id, name_ar, department_id, status, nisab, exempt_periods, role_tags)
        values (v_school, v_names[k], v_dept, 'active', 18, greatest(0, 18 - v_teach[k]),
                case when v_tags[k] = '' then '{}'::text[] else string_to_array(v_tags[k], ',') end)
        returning id into v_staff;
      else
        update public.staff set nisab = 18, exempt_periods = greatest(0, 18 - v_teach[k]),
               role_tags = case when v_tags[k] = '' then '{}'::text[] else string_to_array(v_tags[k], ',') end
          where id = v_staff;
      end if;
      v_staff_ids := array_append(v_staff_ids, v_staff);
    end loop;
    -- distribute class-teaching across the 32 classes (split-fill: each class gets exactly 2)
    v_ci := 1; v_need := 2;
    for k in 1..array_length(v_staff_ids,1) loop
      v_rem := v_teach[k];
      while v_rem > 0 and v_ci <= array_length(v_classes,1) loop
        v_give := least(v_need, v_rem);
        insert into public.staffing_allocations (school_id, academic_year_id, department_id, staff_id, class_id, periods)
        values (v_school, v_year, v_dept, v_staff_ids[k], v_classes[v_ci], v_give)
        on conflict (academic_year_id, department_id, staff_id, class_id)
        do update set periods = excluded.periods;
        v_rem := v_rem - v_give; v_need := v_need - v_give;
        if v_need = 0 then v_ci := v_ci + 1; v_need := 2; end if;
      end loop;
    end loop;
    -- point the department head at the tagged head, if any
    update public.departments set head_id = (
      select s.id from public.staff s where s.department_id = v_dept and 'head' = any(s.role_tags) limit 1
    ) where id = v_dept and exists (select 1 from public.staff s where s.department_id = v_dept and 'head' = any(s.role_tags));
  end if;

  -- ---- التربية البدنية (periods/class = 2) ----
  select id into v_dept from public.departments where school_id = v_school and name_ar = 'التربية البدنية' limit 1;
  if v_dept is not null then
    update public.departments set periods_per_class = 2 where id = v_dept;
    v_names := array['سعد الحواف','محمد عيد الرومي','عبدالرحمن العازمي','خلف العازمي'];
    v_teach := array[14,18,18,14];
    v_tags  := array['subject_supervisor','','','studies'];
    v_staff_ids := array[]::uuid[];
    for k in 1..array_length(v_names,1) loop
      select id into v_staff from public.staff
        where school_id = v_school and department_id = v_dept and name_ar = v_names[k] limit 1;
      if v_staff is null then
        insert into public.staff (school_id, name_ar, department_id, status, nisab, exempt_periods, role_tags)
        values (v_school, v_names[k], v_dept, 'active', 18, greatest(0, 18 - v_teach[k]),
                case when v_tags[k] = '' then '{}'::text[] else string_to_array(v_tags[k], ',') end)
        returning id into v_staff;
      else
        update public.staff set nisab = 18, exempt_periods = greatest(0, 18 - v_teach[k]),
               role_tags = case when v_tags[k] = '' then '{}'::text[] else string_to_array(v_tags[k], ',') end
          where id = v_staff;
      end if;
      v_staff_ids := array_append(v_staff_ids, v_staff);
    end loop;
    -- distribute class-teaching across the 32 classes (split-fill: each class gets exactly 2)
    v_ci := 1; v_need := 2;
    for k in 1..array_length(v_staff_ids,1) loop
      v_rem := v_teach[k];
      while v_rem > 0 and v_ci <= array_length(v_classes,1) loop
        v_give := least(v_need, v_rem);
        insert into public.staffing_allocations (school_id, academic_year_id, department_id, staff_id, class_id, periods)
        values (v_school, v_year, v_dept, v_staff_ids[k], v_classes[v_ci], v_give)
        on conflict (academic_year_id, department_id, staff_id, class_id)
        do update set periods = excluded.periods;
        v_rem := v_rem - v_give; v_need := v_need - v_give;
        if v_need = 0 then v_ci := v_ci + 1; v_need := 2; end if;
      end loop;
    end loop;
    -- point the department head at the tagged head, if any
    update public.departments set head_id = (
      select s.id from public.staff s where s.department_id = v_dept and 'head' = any(s.role_tags) limit 1
    ) where id = v_dept and exists (select 1 from public.staff s where s.department_id = v_dept and 'head' = any(s.role_tags));
  end if;

end $$;
