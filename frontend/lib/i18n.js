import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      dashboard: {
        welcome: "Welcome, {{name}}",
        sub_welcome: "Customize your in-flight culinary experience with absolute precision.",
        flight_identity: "Flight Identity",
        sign_out: "Sign Out",
        account_settings: "Account Settings",
        loading_profile: "Loading your profile...",
        pre_flight_booking: "Pre-Flight Booking",
        completion: "Completion",
        profile_incomplete: {
          title: "Complete Your Profile",
          text: "Some details are missing from your profile. Please complete them to enjoy a personalized experience.",
          later: "Later",
          complete_now: "Complete Now"
        },
        sign_out_confirm: {
          title: "Sign Out",
          text: "Are you sure you want to end your Swadn session?",
          cancel: "Cancel",
          confirm: "Confirm",
          logging_out: "Logging out..."
        }
      },
      meal_selector: {
        configurator: "Swadn Configurator",
        step_x_of_y: "Step {{step}} of {{total}}",
        dietary_blueprint: "Choose Your Dietary Blueprint",
        active_preference: "Active Preference",
        search_placeholder: "Search dish or ingredient...",
        select_customise: "Select & Customise",
        no_dishes: "No dishes found matching your search.",
        avoid_title: "Avoid Specific Ingredients",
        avoid_subtitle: "Tap to exclude items from this specific preparation.",
        forbidden: "Forbidden",
        final_selection: "Final Selection",
        excluding: "Excluding: {{items}}",
        no_exclusions: "No custom exclusions added",
        confirm_book: "Confirm & Book",
        cancel: "Cancel",
        REGULAR: "Regular Meal",
        JAIN: "Jain Meal",
        VEGAN: "Vegan Meal",
        DIABETIC: "Diabetic Meal",
        BABY: "Baby Food"
      },
      settings: {
        title: "Account Settings",
        secure_connection: "Secure connection active",
        save_changes: "Save changes",
        saving: "Saving...",
        changes_saved: "Changes Saved",
        changes_saved_desc: "Your settings have been successfully updated.",
        error_title: "Oops! Something went wrong",
        menu_title: "Settings Menu",
        system_health: "System Health",
        system_status: "System Status",
        loading_settings: "Loading settings...",
        read_only: "Read only",
        select_field: "Select {{field}}",
        categories: {
          personal_account: "Personal & Account",
          household_family: "Household Details",
          dietary_religious: "Dietary & Religious",
          allergies_intolerances: "Allergies & Intolerances",
          health_medical: "Health & Medical",
          nutrition_goals: "Nutrition Goals",
          taste_preferences: "Taste Preferences",
          seasonal_regional: "Seasonal & Regional",
          shopping_preferences: "Shopping Preferences",
          pantry_kitchen: "Pantry & Kitchen",
          meal_planning: "Meal Planning",
          accessibility_ui: "Accessibility & UI",
          behavioral_data: "Cooking Preferences",
          privacy_consent: "Privacy & Consent",
          business_kiosk: "Account Type",
          localization_settings: "Regional Settings"
        },
        sections: {
          personal: {
            title: "Personal Information",
            description: "Manage your profile information"
          },
          language: {
            title: "Language & Currency",
            description: "Region and language settings"
          },
          groups: {
            title: "Groups & Roles",
            description: "Configure roles and permissions"
          },
          group_address: {
            title: "Addresses",
            description: "Manage group delivery addresses"
          },
          payment: {
            title: "Payment Methods",
            description: "Secure billing configurations"
          },
          access: {
            title: "User Access Control",
            description: "User access preferences"
          }
        },
        fields: {
          firstName: "First Name",
          lastName: "Last Name",
          email: "Email Address",
          mobileNumber: "Phone Number",
          languagePreference: "Primary Language",
          currency: "Local Currency",
          timeZone: "Time Zone",
          householdRole: "Your Role",
          householdSize: "Household Size",
          dietType: "Primary Diet",
          religiousRestrictions: "Religious Restrictions",
          allowedMeats: "Allowed Meats",
          eggsAllowed: "Eggs Allowed",
          allergen: "Allergen Name",
          severity: "Reaction Severity",
          medicalConditions: "Medical Conditions",
          height: "Height (cm)",
          weight: "Weight (kg)",
          primaryGoal: "Primary Goal",
          dailyCalories: "Daily Calories",
          macronutrientTargets: "Macronutrient Targets",
          favoriteCuisines: "Favorite Cuisines",
          dislikedIngredients: "Disliked Ingredients",
          spiceLevel: "Spice Level",
          seasonalPreference: "Seasonality",
          regionalCuisine: "Regional Styles",
          preferredStore: "Preferred Store",
          fulfillmentMode: "Fulfillment Mode",
          budgetRange: "Budget Range",
          pantryItems: "Pantry Staples",
          kitchenAppliances: "Appliances",
          mealsPerDay: "Meals Per Day",
          prepTimeLimit: "Time Limit",
          accessibilityNeeds: "Accessibility Needs",
          notificationPreferences: "Notification Preferences",
          recipeFeedback: "Feedback Mode",
          cookingSkillLevel: "Skill Level",
          profileDataConsent: "Profile Consent",
          healthDataConsent: "Health Consent",
          accountType: "Account Type",
          kioskSessionMode: "Kiosk Mode"
        },
        placeholders: {
          firstName: "Enter first name",
          lastName: "Enter last name",
          householdSize: "Enter number of members",
          dailyCalories: "Target kcal",
          mealsPerDay: "e.g. 3"
        }
      }
    }
  },
  de: {
    translation: {
      dashboard: {
        welcome: "Willkommen, {{name}}",
        sub_welcome: "Passen Sie Ihr kulinarisches Erlebnis an Bord mit absoluter Präzision an.",
        flight_identity: "Flugidentität",
        sign_out: "Abmelden",
        account_settings: "Kontoeinstellungen",
        loading_profile: "Ihr Profil wird geladen...",
        pre_flight_booking: "Pre-Flight Buchung",
        completion: "Fertigstellung",
        profile_incomplete: {
          title: "Vervollständigen Sie Ihr Profil",
          text: "Einige Angaben fehlen in Ihrem Profil. Bitte vervollständigen Sie diese, um ein personalisiertes Erlebnis zu genießen.",
          later: "Später",
          complete_now: "Jetzt ausfüllen"
        },
        sign_out_confirm: {
          title: "Abmelden",
          text: "Sind Sie sicher, dass Sie Ihre Swadn-Sitzung beenden möchten?",
          cancel: "Abbrechen",
          confirm: "Bestätigen",
          logging_out: "Abmeldung läuft..."
        }
      },
      meal_selector: {
        configurator: "Swadn Konfigurator",
        step_x_of_y: "Schritt {{step}} von {{total}}",
        dietary_blueprint: "Wählen Sie Ihren Ernährungsplan",
        active_preference: "Aktive Präferenz",
        search_placeholder: "Gericht oder Zutat suchen...",
        select_customise: "Auswählen & Anpassen",
        no_dishes: "Keine Gerichte gefunden, die Ihrer Suche entsprechen.",
        avoid_title: "Bestimmte Zutaten vermeiden",
        avoid_subtitle: "Tippen Sie, um Zutaten von dieser speziellen Zubereitung auszuschließen.",
        forbidden: "Verboten",
        final_selection: "Endgültige Auswahl",
        excluding: "Ohne: {{items}}",
        no_exclusions: "Keine individuellen Ausschlüsse hinzugefügt",
        confirm_book: "Bestätigen & Buchen",
        cancel: "Abbrechen",
        REGULAR: "Standardmahlzeit",
        JAIN: "Jain-Mahlzeit",
        VEGAN: "Vegane Mahlzeit",
        DIABETIC: "Diabetiker-Mahlzeit",
        BABY: "Babynahrung"
      },
      settings: {
        title: "Kontoeinstellungen",
        secure_connection: "Sichere Verbindung aktiv",
        save_changes: "Änderungen speichern",
        saving: "Wird gespeichert...",
        changes_saved: "Änderungen gespeichert",
        changes_saved_desc: "Ihre Einstellungen wurden erfolgreich aktualisiert.",
        error_title: "Hoppla! Etwas ist schiefgelaufen",
        menu_title: "Einstellungsmenü",
        system_health: "Systemzustand",
        system_status: "Systemstatus",
        loading_settings: "Einstellungen werden geladen...",
        read_only: "Schreibgeschützt",
        select_field: "{{field}} auswählen",
        categories: {
          personal_account: "Persönliche Daten",
          household_family: "Haushaltsdetails",
          dietary_religious: "Ernährung & Religion",
          allergies_intolerances: "Allergien & Unverträglichkeiten",
          health_medical: "Gesundheit & Medizin",
          nutrition_goals: "Ernährungsziele",
          taste_preferences: "Geschmacksvorlieben",
          seasonal_regional: "Saisonal & Regional",
          shopping_preferences: "Einkaufseinstellungen",
          pantry_kitchen: "Speisekammer & Küche",
          meal_planning: "Mahlzeitenplanung",
          accessibility_ui: "Barrierefreiheit & Benutzeroberfläche",
          behavioral_data: "Kochvorlieben",
          privacy_consent: "Datenschutz & Einwilligung",
          business_kiosk: "Kontotyp",
          localization_settings: "Regionale Einstellungen"
        },
        sections: {
          personal: {
            title: "Persönliche Daten",
            description: "Verwalten Sie Ihre Profilinformationen"
          },
          language: {
            title: "Sprache & Währung",
            description: "Regions- und Spracheinstellungen"
          },
          groups: {
            title: "Gruppen & Rollen",
            description: "Konfigurieren Sie Rollen und Berechtigungen"
          },
          group_address: {
            title: "Gruppenadresse",
            description: "Lieferadressen der Gruppe verwalten"
          },
          payment: {
            title: "Zahlungsmethoden",
            description: "Sichere Abrechnungseinstellungen"
          },
          access: {
            title: "Zugriff & Berechtigungen",
            description: "Nutzerzugriffseinstellungen"
          }
        },
        fields: {
          firstName: "Vorname",
          lastName: "Nachname",
          email: "E-Mail-Adresse",
          mobileNumber: "Telefonnummer",
          languagePreference: "Bevorzugte Sprache",
          currency: "Lokale Währung",
          timeZone: "Zeitzone",
          householdRole: "Ihre Rolle",
          householdSize: "Haushaltsgröße",
          dietType: "Hauptdiät",
          religiousRestrictions: "Religiöse Einschränkungen",
          allowedMeats: "Erlaubte Fleischsorten",
          eggsAllowed: "Eier erlaubt",
          allergen: "Allergenname",
          severity: "Reaktionsschwere",
          medicalConditions: "Medizinische Bedingungen",
          height: "Größe (cm)",
          weight: "Gewicht (kg)",
          primaryGoal: "Hauptziel",
          dailyCalories: "Tägliche Kalorien",
          macronutrientTargets: "Nährstoffverteilung",
          favoriteCuisines: "Lieblingsküchen",
          dislikedIngredients: "Unerwünschte Zutaten",
          spiceLevel: "Schärfegrad",
          seasonalPreference: "Saisonalität",
          regionalCuisine: "Regionale Stile",
          preferredStore: "Bevorzugtes Geschäft",
          fulfillmentMode: "Erfüllungsmodus",
          budgetRange: "Budgetbereich",
          pantryItems: "Vorräte",
          kitchenAppliances: "Küchengeräte",
          mealsPerDay: "Mahlzeiten pro Tag",
          prepTimeLimit: "Zeitlimit",
          accessibilityNeeds: "Barrierefreiheit",
          notificationPreferences: "Benachrichtigungen",
          recipeFeedback: "Feedback-Modus",
          cookingSkillLevel: "Kochkenntnisse",
          profileDataConsent: "Profileinwilligung",
          healthDataConsent: "Gesundheitseinwilligung",
          accountType: "Kontotyp",
          kioskSessionMode: "Kiosk-Modus"
        },
        placeholders: {
          firstName: "Vorname eingeben",
          lastName: "Nachname eingeben",
          householdSize: "Mitgliederanzahl eingeben",
          dailyCalories: "Ziel kcal",
          mealsPerDay: "z.B. 3"
        }
      }
    }
  },
  hi: {
    translation: {
      dashboard: {
        welcome: "स्वागत है, {{name}}",
        sub_welcome: "उड़ान के दौरान अपने भोजन के अनुभव को पूर्ण सटीकता के साथ अनुकूलित करें।",
        flight_identity: "उड़ान पहचान",
        sign_out: "साइन आउट",
        account_settings: "खाता सेटिंग्स",
        loading_profile: "आपकी प्रोफ़ाइल लोड हो रही है...",
        pre_flight_booking: "उड़ान-पूर्व भोजन बुकिंग",
        completion: "प्रोफ़ाइल पूर्णता",
        profile_incomplete: {
          title: "अपनी प्रोफ़ाइल पूरी करें",
          text: "आपकी प्रोफ़ाइल में कुछ विवरण गायब हैं। व्यक्तिगत अनुभव का आनंद लेने के लिए कृपया उन्हें पूरा करें।",
          later: "बाद में",
          complete_now: "अभी पूरा करें"
        },
        sign_out_confirm: {
          title: "साइन आउट",
          text: "क्या आप वाकई अपना Swadn सत्र समाप्त करना चाहते हैं?",
          cancel: "रद्द करें",
          confirm: "पुष्टि करें",
          logging_out: "साइन आउट हो रहा है..."
        }
      },
      meal_selector: {
        configurator: "Swadn कॉन्फिगरेटर",
        step_x_of_y: "चरण {{step}} / {{total}}",
        dietary_blueprint: "अपनी आहार प्राथमिकता चुनें",
        active_preference: "सक्रिय प्राथमिकता",
        search_placeholder: "व्यंजन या सामग्री खोजें...",
        select_customise: "चुनें और अनुकूलित करें",
        no_dishes: "आपकी खोज से मेल खाता हुआ कोई व्यंजन नहीं मिला।",
        avoid_title: "विशिष्ट सामग्रियों से बचें",
        avoid_subtitle: "इस विशिष्ट व्यंजन से किसी सामग्री को बाहर निकालने के लिए टैप करें।",
        forbidden: "वर्जित",
        final_selection: "अंतिम चयन",
        excluding: "इन्हें छोड़कर: {{items}}",
        no_exclusions: "कोई सामग्री बाहर नहीं की गई",
        confirm_book: "पुष्टि करें और बुक करें",
        cancel: "रद्द करें",
        REGULAR: "नियमित भोजन",
        JAIN: "जैन भोजन",
        VEGAN: "शाकाहारी (Vegan) भोजन",
        DIABETIC: "मधुमेह (Diabetic) भोजन",
        BABY: "बच्चों का भोजन"
      },
      settings: {
        title: "खाता सेटिंग्स",
        secure_connection: "सुरक्षित कनेक्शन सक्रिय",
        save_changes: "परिवर्तन सहेजें",
        saving: "सहेजा जा रहा है...",
        changes_saved: "परिवर्तन सहेज लिए गए",
        changes_saved_desc: "आपकी सेटिंग्स सफलतापूर्वक अपडेट कर दी गई हैं।",
        error_title: "ओह! कुछ गलत हो गया",
        menu_title: "सेटिंग्स मेनू",
        system_health: "सिस्टम स्वास्थ्य",
        system_status: "सिस्टम स्थिति",
        loading_settings: "सेटिंग्स लोड हो रही हैं...",
        read_only: "केवल पढ़ने योग्य",
        select_field: "{{field}} चुनें",
        categories: {
          personal_account: "व्यक्तिगत और खाता",
          household_family: "पारिवारिक विवरण",
          dietary_religious: "आहार और धार्मिक",
          allergies_intolerances: "एलर्जी और असहिष्णुता",
          health_medical: "स्वास्थ्य और चिकित्सा",
          nutrition_goals: "पोषण लक्ष्य",
          taste_preferences: "स्वाद प्राथमिकताएं",
          seasonal_regional: "मौसमी और क्षेत्रीय",
          shopping_preferences: "खरीदारी प्राथमिकताएं",
          pantry_kitchen: "रसोई भंडार और उपकरण",
          meal_planning: "भोजन योजना",
          accessibility_ui: "पहुंच-योग्यता और यूआई",
          behavioral_data: "खाना पकाने की प्राथमिकताएं",
          privacy_consent: "गोपनीयता और सहमति",
          business_kiosk: "खाता प्रकार",
          localization_settings: "क्षेत्रीय सेटिंग्स"
        },
        sections: {
          personal: {
            title: "व्यक्तिगत जानकारी",
            description: "अपनी प्रोफ़ाइल जानकारी प्रबंधित करें"
          },
          language: {
            title: "भाषा और मुद्रा",
            description: "क्षेत्र और भाषा सेटिंग्स"
          },
          groups: {
            title: "समूह और भूमिकाएं",
            description: "भूमिकाएं और अनुमतियां सेट करें"
          },
          group_address: {
            title: "समूह का पता",
            description: "समूह वितरण पते प्रबंधित करें"
          },
          payment: {
            title: "भुगतान के तरीके",
            description: "सुरक्षित बिलिंग सेटिंग्स"
          },
          access: {
            title: "पहुंच और अनुमतियां",
            description: "उपयोगकर्ता पहुंच प्राथमिकताएं"
          }
        },
        fields: {
          firstName: "पहला नाम",
          lastName: "अंतिम नाम",
          email: "ईमेल पता",
          mobileNumber: "फ़ोन नंबर",
          languagePreference: "प्राथमिक भाषा",
          currency: "स्थानीय मुद्रा",
          timeZone: "समय क्षेत्र",
          householdRole: "आपकी भूमिका",
          householdSize: "परिवार का आकार",
          dietType: "प्राथमिक आहार",
          religiousRestrictions: "धार्मिक प्रतिबंध",
          allowedMeats: "स्वीकार्य मांस",
          eggsAllowed: "अंडे की अनुमति",
          allergen: "एलर्जेन नाम",
          severity: "प्रतिक्रिया की तीव्रता",
          medicalConditions: "चिकित्सा स्थितियां",
          height: "लंबाई (सेमी)",
          weight: "वजन (किग्रा)",
          primaryGoal: "प्राथमिक लक्ष्य",
          dailyCalories: "दैनिक कैलोरी",
          macronutrientTargets: "पोषक तत्व लक्ष्य",
          favoriteCuisines: "पसंदीदा व्यंजन शैली",
          dislikedIngredients: "नापसंद सामग्रियां",
          spiceLevel: "तीखापन स्तर",
          seasonalPreference: "मौसमी प्राथमिकता",
          regionalCuisine: "क्षेत्रीय शैलियाँ",
          preferredStore: "पसंदीदा स्टोर",
          fulfillmentMode: "पूर्ति मोड",
          budgetRange: "बजट सीमा",
          pantryItems: "भंडार की मुख्य वस्तुएं",
          kitchenAppliances: "रसोई उपकरण",
          mealsPerDay: "प्रतिदिन भोजन संख्या",
          prepTimeLimit: "समय सीमा",
          accessibilityNeeds: "पहुंच-योग्यता आवश्यकताएं",
          notificationPreferences: "सूचना प्राथमिकताएं",
          recipeFeedback: "प्रतिक्रिया मोड",
          cookingSkillLevel: "पाक कौशल स्तर",
          profileDataConsent: "प्रोफ़ाइल सहमति",
          healthDataConsent: "स्वास्थ्य डेटा सहमति",
          accountType: "खाता प्रकार",
          kioskSessionMode: "कियोस्क मोड"
        },
        placeholders: {
          firstName: "पहला नाम दर्ज करें",
          lastName: "अंतिम नाम दर्ज करें",
          householdSize: "सदस्यों की संख्या दर्ज करें",
          dailyCalories: "लक्षित कैलोरी (kcal)",
          mealsPerDay: "जैसे: 3"
        }
      }
    }
  },
  ta: {
    translation: {
      dashboard: {
        welcome: "வரவேற்கிறோம், {{name}}",
        sub_welcome: "விமான பயணத்தின் போது உங்களது உணவு விருப்பங்களை மிகத் துல்லியமாகத் தனிப்பயனாக்குங்கள்.",
        flight_identity: "விமான அடையாளம்",
        sign_out: "வெளியேறு",
        account_settings: "கணக்கு அமைப்புகள்",
        loading_profile: "தங்களின் விவரங்கள் ஏற்றப்படுகின்றன...",
        pre_flight_booking: "விமான முன்பதிவு உணவு",
        completion: "பூர்த்தி நிலை",
        profile_incomplete: {
          title: "சுயவிவரத்தை நிறைவு செய்க",
          text: "தங்கள் சுயவிவரத்தில் சில விவரங்கள் விடுபட்டுள்ளன. தனிப்பயனாக்கப்பட்ட அனுபவத்தைப் பெற அவற்றை நிறைவு செய்யவும்.",
          later: "பிறகு",
          complete_now: "இப்போது நிறைவு செய்க"
        },
        sign_out_confirm: {
          title: "வெளியேறு",
          text: "Swadn அமர்வை உறுதியாக முடிக்க விரும்புகிறீர்களா?",
          cancel: "ரத்து செய்",
          confirm: "உறுதிப்படுத்து",
          logging_out: "வெளியேறுகிறது..."
        }
      },
      meal_selector: {
        configurator: "Swadn கட்டமைப்பாளர்",
        step_x_of_y: "படி {{step}} / {{total}}",
        dietary_blueprint: "உணவுத் திட்டத்தைத் தேர்ந்தெடுக்கவும்",
        active_preference: "தற்போதைய தேர்வு",
        search_placeholder: "உணவு அல்லது மூலப்பொருளைத் தேடுக...",
        select_customise: "தேர்ந்தெடுத்து தனிப்பயனாக்கு",
        no_dishes: "உங்கள் தேடலுக்குப் பொருந்தும் உணவுகள் ஏதும் இல்லை.",
        avoid_title: "குறிப்பிட்ட மூலப்பொருட்களைத் தவிர்க்கவும்",
        avoid_subtitle: "இந்த குறிப்பிட்ட உணவிலிருந்து பொருட்களைத் தவிர்க்க தட்டவும்.",
        forbidden: "தடுக்கப்பட்டது",
        final_selection: "இறுதித் தேர்வு",
        excluding: "தவிர்க்கப்பட்டவை: {{items}}",
        no_exclusions: "மூலப்பொருட்கள் எதுவும் தவிர்க்கப்படவில்லை",
        confirm_book: "உறுதிசெய்து முன்பதிவு செய்",
        cancel: "ரத்து செய்",
        REGULAR: "சாதாரண உணவு",
        JAIN: "ஜெயின் உணவு",
        VEGAN: "சைவ (Vegan) உணவு",
        DIABETIC: "சர்க்கரை நோயாளிகளுக்கான உணவு",
        BABY: "குழந்தைகளுக்கான உணவு"
      },
      settings: {
        title: "கணக்கு அமைப்புகள்",
        secure_connection: "பாதுகாப்பான இணைப்பு செயலில் உள்ளது",
        save_changes: "மாற்றங்களைச் சேமி",
        saving: "சேமிக்கப்படுகிறது...",
        changes_saved: "மாற்றங்கள் சேமிக்கப்பட்டன",
        changes_saved_desc: "உங்கள் அமைப்புகள் வெற்றிகரமாகப் புதுப்பிக்கப்பட்டன.",
        error_title: "அடடா! ஏதோ தவறு நடந்துவிட்டது",
        menu_title: "அமைப்புகள் மெனு",
        system_health: "கணினி ஆரோக்கியம்",
        system_status: "கணினி நிலை",
        loading_settings: "அமைப்புகள் ஏற்றப்படுகின்றன...",
        read_only: "வாசிக்க மட்டும்",
        select_field: "{{field}} தேர்ந்தெடுக்கவும்",
        categories: {
          personal_account: "தனிப்பட்ட விவரங்கள்",
          household_family: "குடும்ப விவரங்கள்",
          dietary_religious: "உணவு மற்றும் ஆன்மீகம்",
          allergies_intolerances: "ஒவ்வாமைகள்",
          health_medical: "உடல்நலம் மற்றும் மருத்துவம்",
          nutrition_goals: "ஊட்டச்சத்து இலக்குகள்",
          taste_preferences: "சுவை விருப்பங்கள்",
          seasonal_regional: "பருவகாலம் மற்றும் வட்டாரம்",
          shopping_preferences: "கொள்முதல் விருப்பங்கள்",
          pantry_kitchen: "சமையலறைப் பொருட்கள்",
          meal_planning: "உணவுத் திட்டமிடல்",
          accessibility_ui: "அணுகல்தன்மை மற்றும் இடைமுகம்",
          behavioral_data: "சமையல் விருப்பங்கள்",
          privacy_consent: "தனியுரிமை மற்றும் ஒப்புதல்",
          business_kiosk: "கணக்கு வகை",
          localization_settings: "பிராந்திய அமைப்புகள்"
        },
        sections: {
          personal: {
            title: "தனிப்பட்ட விவரங்கள்",
            description: "உங்கள் சுயவிவரத் தகவலை நிர்வகிக்கவும்"
          },
          language: {
            title: "மொழி மற்றும் நாணயம்",
            description: "வட்டாரம் மற்றும் மொழி அமைப்புகள்"
          },
          groups: {
            title: "குழுக்கள் மற்றும் பாத்திரங்கள்",
            description: "அனுமதிகள் மற்றும் பாத்திரங்களை அமைக்கவும்"
          },
          group_address: {
            title: "குழு முகவரி",
            description: "குழு விநியோக முகவரிகளை நிர்வகிக்கவும்"
          },
          payment: {
            title: "கட்டண முறைகள்",
            description: "பாதுகாப்பான கட்டண அமைப்புகள்"
          },
          access: {
            title: "அணுகல் மற்றும் அனுமதிகள்",
            description: "பயனர் அணுகல் விருப்பங்கள்"
          }
        },
        fields: {
          firstName: "முதல் பெயர்",
          lastName: "கடைசி பெயர்",
          email: "மின்னஞ்சல் முகவரி",
          mobileNumber: "கைபேசி எண்",
          languagePreference: "முதன்மை மொழி",
          currency: "உள்ளூர் நாணயம்",
          timeZone: "நேர மண்டலம்",
          householdRole: "உங்களது பங்கு",
          householdSize: "குடும்ப உறுப்பினர்கள் எண்ணிக்கை",
          dietType: "முதன்மை உணவு முறை",
          religiousRestrictions: "ஆன்மீகக் கட்டுப்பாடுகள்",
          allowedMeats: "அனுமதிக்கப்பட்ட இறைச்சிகள்",
          eggsAllowed: "முட்டை அனுமதிக்கப்படுகிறதா",
          allergen: "ஒவ்வாமைப் பொருள் பெயர்",
          severity: "பாதிப்பின் தீவிரம்",
          medicalConditions: "மருத்துவ நிலைகள்",
          height: "உயரம் (செ.மீ)",
          weight: "எடை (கிலோ)",
          primaryGoal: "முதன்மை இலக்கு",
          dailyCalories: "தினசரி கலோரி",
          macronutrientTargets: "ஊட்டச்சத்து இலக்குகள்",
          favoriteCuisines: "விருப்பமான உணவு வகைகள்",
          dislikedIngredients: "விரும்பத்தகாத மூலப்பொருட்கள்",
          spiceLevel: "கார அளவு",
          seasonalPreference: "பருவகால விருப்பம்",
          regionalCuisine: "வட்டார பாணிகள்",
          preferredStore: "விருப்பமான கடை",
          fulfillmentMode: "விநியோக முறை",
          budgetRange: "வரவுசெலவு வரம்பு",
          pantryItems: "சமையலறை அத்தியாவசியப் பொருட்கள்",
          kitchenAppliances: "சமையல் சாதனங்கள்",
          mealsPerDay: "ஒரு நாளைக்கான உணவுகள்",
          prepTimeLimit: "தயாரிப்பு நேர வரம்பு",
          accessibilityNeeds: "அணுகல்தன்மை தேவைகள்",
          notificationPreferences: "அறிவிப்பு விருப்பங்கள்",
          recipeFeedback: "கருத்து முறை",
          cookingSkillLevel: "சமையல் திறன் நிலை",
          profileDataConsent: "சுயவிவர ஒப்புதல்",
          healthDataConsent: "உடல்நலத் தரவு ஒப்புதல்",
          accountType: "கணக்கு வகை",
          kioskSessionMode: "கியோஸ்க் முறை"
        },
        placeholders: {
          firstName: "முதல் பெயரை உள்ளிடவும்",
          lastName: "கடைசி பெயரை உள்ளிடவும்",
          householdSize: "உறுப்பினர்களின் எண்ணிக்கையை உள்ளிடவும்",
          dailyCalories: "இலக்கு கலோரிகள்",
          mealsPerDay: "எ.கா. 3"
        }
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

export default i18n;
