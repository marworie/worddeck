-- Hazır tema listeleri (herkes için ortak, kullanıcıya ait değil)
IF OBJECT_ID('Themes') IS NULL
BEGIN
    CREATE TABLE Themes (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Slug VARCHAR(30) NOT NULL UNIQUE,      -- kodda kullanılan sabit ad: 'food'
        Name NVARCHAR(50) NOT NULL,            -- ekranda: 'Yemek & İçecek'
        Icon NVARCHAR(16) NOT NULL,
        SortOrder INT NOT NULL
    );

    CREATE TABLE ThemeWords (
        ThemeId INT NOT NULL,
        WordId INT NOT NULL,
        CONSTRAINT PK_ThemeWords PRIMARY KEY (ThemeId, WordId),
        CONSTRAINT FK_ThemeWords_Themes FOREIGN KEY (ThemeId) REFERENCES Themes(Id) ON DELETE CASCADE,
        CONSTRAINT FK_ThemeWords_Words FOREIGN KEY (WordId) REFERENCES Words(Id)
    );
END
GO

-- Temalar ve kelimeleri (sadece ilk çalıştırmada eklenir)
IF NOT EXISTS (SELECT 1 FROM Themes)
BEGIN
    INSERT INTO Themes (Slug, Name, Icon, SortOrder) VALUES
        ('food',       N'Yemek & İçecek',    N'🍎', 1),
        ('travel',     N'Seyahat',           N'✈️', 2),
        ('work',       N'İş & Kariyer',      N'💼', 3),
        ('health',     N'Sağlık',            N'🩺', 4),
        ('home',       N'Ev & Yaşam',        N'🏠', 5),
        ('emotions',   N'Duygular',          N'😊', 6),
        ('nature',     N'Doğa & Hava',       N'🌿', 7),
        ('education',  N'Eğitim',            N'🎓', 8),
        ('shopping',   N'Alışveriş',         N'🛍️', 9),
        ('technology', N'Teknoloji',         N'💻', 10),
        ('family',     N'Aile & İnsanlar',   N'👪', 11),
        ('city',       N'Şehir & Ulaşım',    N'🏙️', 12);

    -- Her tema için virgülle ayrılmış kelimeler; listede olmayanlar eşleşmez, sorun değil
    DECLARE @Seed TABLE (Slug VARCHAR(30), Words NVARCHAR(MAX));
    INSERT INTO @Seed (Slug, Words) VALUES
    ('food', N'apple,banana,bread,butter,cheese,chicken,coffee,cake,egg,fish,fruit,juice,meat,milk,rice,salad,salt,sugar,soup,tea,vegetable,water,breakfast,lunch,dinner,restaurant,menu,delicious,hungry,thirsty,cook,bake,fry,boil,recipe,ingredient,flavour,flavor,spicy,sweet,bitter,dessert,snack,beverage,portion,diet,nutrition,appetite,vegetarian,pepper,onion,potato,tomato,carrot,flour,sauce'),
    ('travel', N'airport,passport,ticket,luggage,suitcase,hotel,flight,train,station,journey,trip,tour,tourist,map,guide,abroad,destination,reservation,booking,departure,arrival,delay,platform,boarding,customs,visa,souvenir,sightseeing,accommodation,border,coast,beach,island,foreign,currency,exchange,backpack,cruise,itinerary,landmark,explore'),
    ('work', N'job,office,manager,boss,colleague,salary,career,interview,meeting,contract,employee,employer,company,business,customer,client,deadline,project,report,promotion,resign,hire,retire,profession,skill,experience,qualification,applicant,application,schedule,task,team,department,budget,profit,negotiate,agenda,conference,workplace,overtime,unemployment'),
    ('health', N'doctor,nurse,hospital,medicine,pain,ill,sick,fever,cough,headache,injury,wound,patient,treatment,symptom,disease,illness,infection,prescription,pharmacy,surgery,recover,heal,healthy,exercise,emergency,ambulance,appointment,vaccine,allergy,therapy,diagnosis,blood,heart,stomach,tooth,dentist,bandage,pill'),
    ('home', N'house,home,room,kitchen,bedroom,bathroom,garden,door,window,wall,floor,roof,stairs,furniture,table,chair,sofa,bed,lamp,cupboard,shelf,mirror,carpet,curtain,fridge,oven,sink,shower,neighbour,neighbor,rent,apartment,flat,landlord,tenant,clean,tidy,laundry,decorate,garage,balcony,key'),
    ('emotions', N'happy,sad,angry,afraid,scared,worried,nervous,excited,bored,tired,surprised,proud,ashamed,jealous,lonely,calm,relaxed,upset,disappointed,confident,embarrassed,anxious,cheerful,grateful,frustrated,satisfied,delighted,miserable,curious,hopeful,guilty,love,hate,fear,joy,anger,sorrow,mood,emotion,feeling'),
    ('nature', N'tree,flower,forest,river,lake,sea,ocean,mountain,hill,valley,desert,sky,cloud,rain,snow,wind,storm,sun,weather,temperature,season,spring,summer,autumn,winter,climate,environment,pollution,earth,nature,plant,animal,grass,leaf,rock,wave,thunder,lightning,fog,sunny,cloudy,rainy,wildlife'),
    ('education', N'school,teacher,student,class,lesson,exam,test,homework,university,college,degree,subject,course,lecture,library,notebook,pencil,grade,study,learn,teach,knowledge,research,essay,assignment,semester,graduate,scholarship,tuition,curriculum,professor,classroom,dictionary,revise,education,pupil,certificate'),
    ('shopping', N'shop,store,market,supermarket,buy,sell,price,cheap,expensive,discount,sale,receipt,cash,credit,pay,cost,bag,basket,queue,brand,product,size,refund,bargain,purchase,order,delivery,online,mall,cashier,wallet,coin,afford,spend,offer,quality'),
    ('technology', N'computer,laptop,phone,mobile,internet,website,email,password,software,hardware,app,download,upload,screen,keyboard,mouse,printer,battery,charger,network,digital,device,data,program,file,folder,click,search,technology,robot,camera,video,message,social,update,install,wireless,virus,user'),
    ('family', N'family,mother,father,parent,brother,sister,son,daughter,husband,wife,child,baby,grandmother,grandfather,uncle,aunt,cousin,nephew,niece,relative,friend,marriage,wedding,divorce,birthday,generation,adult,teenager,elderly,twin,partner,couple,guest,relationship'),
    ('city', N'city,town,village,street,road,bridge,building,bank,park,square,museum,cinema,theatre,theater,church,mosque,police,traffic,bus,car,taxi,bicycle,motorbike,underground,subway,parking,crossroads,pavement,pedestrian,corner,downtown,suburb,population,crowded,citizen,transport,fuel,driver');

    -- Kelimeleri ayır, Words tablosuyla eşleştir.
    -- Aynı yazılışın birden fazla türü varsa (cook: isim/fiil) sadece en düşük seviyedekini al
    INSERT INTO ThemeWords (ThemeId, WordId)
    SELECT t.Id, x.WordId
    FROM (
        SELECT s.Slug, w.Id AS WordId,
               ROW_NUMBER() OVER (PARTITION BY s.Slug, w.Headword ORDER BY w.Level, w.Id) AS Rn
        FROM @Seed s
        CROSS APPLY STRING_SPLIT(s.Words, ',') parts
        INNER JOIN Words w ON w.Headword = LTRIM(RTRIM(parts.value))
    ) x
    INNER JOIN Themes t ON t.Slug = x.Slug
    WHERE x.Rn = 1;
END
GO