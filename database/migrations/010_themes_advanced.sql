-- Temalara ileri seviye (B1–C1) kelimeler. Tekrar çalıştırılabilir: var olan kelimeyi eklemez
DECLARE @Seed TABLE (Slug VARCHAR(30), Words NVARCHAR(MAX));
INSERT INTO @Seed (Slug, Words) VALUES
('food', N'cuisine,culinary,edible,nutritious,organic,appetizer,gourmet,savoury,savory,delicacy,ferment,marinate,garnish,grill,roast,slice,stew,crisp,raw,ripe,seasoning,staple,wholesome,consume,consumption,intake,digest'),
('travel', N'commute,excursion,expedition,voyage,terminal,transit,embark,scenic,picturesque,remote,exotic,hospitality,lodge,resort,hostel,cabin,route,navigate,passenger,fare,overseas,wander,roam,heritage,pilgrimage'),
('work', N'recruit,recruitment,workforce,entrepreneur,enterprise,corporation,merger,revenue,turnover,shareholder,stakeholder,appraisal,delegate,supervise,supervisor,freelance,internship,intern,payroll,pension,redundancy,dismiss,candidate,vacancy,competence,productivity,collaborate,initiative,incentive,executive'),
('health', N'chronic,acute,contagious,epidemic,pandemic,immune,immunity,obesity,rehabilitation,diagnose,physician,surgeon,clinic,ward,dose,inflammation,fatigue,nausea,dizzy,sprain,fracture,vitamin,mental,wellbeing,hygiene,prevention,remedy,cure'),
('home', N'household,chore,mortgage,renovate,refurbish,utility,appliance,cushion,drawer,wardrobe,closet,attic,basement,cellar,porch,hallway,corridor,doorstep,lease,residence,dwelling,spacious,cosy,cozy,domestic,maintenance,plumbing,heating,interior'),
('emotions', N'anxiety,despair,grief,resentment,enthusiasm,gratitude,compassion,empathy,sympathy,contempt,envy,irritated,furious,thrilled,overwhelmed,content,nostalgia,nostalgic,optimistic,pessimistic,sentimental,devastated,astonished,terrified,humiliated,insecure,moody,outrage,relief,affection'),
('nature', N'ecosystem,habitat,species,biodiversity,conservation,extinction,extinct,drought,flood,earthquake,volcano,hurricane,glacier,erosion,landscape,terrain,vegetation,wilderness,rainforest,emission,renewable,sustainable,sustainability,recycle,humid,humidity,breeze,frost,horizon,tide,coastline,meadow'),
('education', N'academic,faculty,dissertation,thesis,seminar,tutorial,tutor,enrol,enroll,enrolment,diploma,bachelor,doctorate,literacy,discipline,plagiarism,syllabus,campus,undergraduate,postgraduate,assessment,evaluate,comprehension,vocabulary,grammar,mentor'),
('shopping', N'consumer,retail,retailer,wholesale,merchandise,warranty,guarantee,voucher,coupon,invoice,instalment,installment,checkout,stock,outlet,boutique,browse,luxury,affordable,overpriced,transaction,deposit,loan,debt'),
('technology', N'algorithm,artificial,automation,bandwidth,browser,database,encryption,gadget,innovation,interface,malware,processor,server,storage,streaming,subscription,upgrade,virtual,hack,hacker,glitch,compatible,configure,broadband,modem,router,smartphone,tablet'),
('family', N'ancestor,descendant,sibling,spouse,fiance,upbringing,adolescent,adolescence,childhood,kinship,inherit,inheritance,adopt,adoption,guardian,orphan,widow,widower,bond,elder,offspring,maternal,paternal,peer,acquaintance'),
('city', N'infrastructure,urban,metropolitan,municipal,residential,district,neighbourhood,neighborhood,skyscraper,avenue,boulevard,intersection,junction,roundabout,congestion,commuter,sidewalk,tram,ferry,toll,vehicle,outskirts,slum,plaza,monument,cathedral,architecture');

INSERT INTO ThemeWords (ThemeId, WordId)
SELECT t.Id, x.WordId
FROM (
    SELECT s.Slug, w.Id AS WordId, w.Headword,
           ROW_NUMBER() OVER (PARTITION BY s.Slug, w.Headword ORDER BY w.Level, w.Id) AS Rn
    FROM @Seed s
    CROSS APPLY STRING_SPLIT(s.Words, ',') parts
    INNER JOIN Words w ON w.Headword = LTRIM(RTRIM(parts.value))
) x
INNER JOIN Themes t ON t.Slug = x.Slug
WHERE x.Rn = 1
  -- Bu temada aynı yazılışta bir kelime zaten varsa ekleme (başka türü olsa bile)
  AND NOT EXISTS (
      SELECT 1 FROM ThemeWords tw
      INNER JOIN Words ew ON ew.Id = tw.WordId
      WHERE tw.ThemeId = t.Id AND ew.Headword = x.Headword
  );