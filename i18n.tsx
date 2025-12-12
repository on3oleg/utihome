import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'uk';

export const translations = {
  en: {
    common: {
      loading: "Loading...",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      add: "Add",
      currency: "₴",
      units: {
        kwh: "kWh",
        m3: "m³",
        fixed: "fixed"
      }
    },
    auth: {
      welcomeBack: "Welcome Back",
      createAccount: "Create Account",
      email: "Email Address",
      password: "Password",
      signIn: "Sign In",
      signUp: "Sign Up",
      noAccount: "Don't have an account?",
      hasAccount: "Already have an account?",
      signInAction: "Sign in",
      signUpAction: "Sign up",
      forgotPassword: "Forgot Password?",
      resetPasswordTitle: "Reset Password",
      sendResetLink: "Send Instructions",
      backToSignIn: "Back to Sign In",
      resetDescription: "Enter your email address and we'll send you instructions to reset your password.",
      resetSuccess: "If an account exists, a reset link has been sent.",
      errors: {
        invalid: "Invalid email or password",
        taken: "Registration failed. Email might be taken.",
        generic: "An error occurred"
      }
    },
    layout: {
      calculator: "Calculator",
      history: "History",
      settings: "Settings",
      profile: "Profile",
      signOut: "Sign Out",
      addProperty: "Add Property",
      loggedIn: "Logged in",
      subtitle: "Smart Utility Tracking"
    },
    calculator: {
      calculatingFor: "Calculating for:",
      newReadings: "New Readings",
      bill: "Bill",
      electricity: "Electricity",
      water: "Water",
      gas: "Gas",
      rate: "Rate",
      prev: "Prev",
      current: "Current",
      usage: "Usage",
      fixedFee: "Fixed Fee",
      estimatedBill: "Estimated Bill",
      saveButton: "Save Bill",
      saveError: "Failed to save bill. Please try again.",
      loadError: "Failed to load tariff rates.",
      standardUtilities: "Standard Utilities"
    },
    history: {
      historyFor: "History for:",
      costBreakdown: "Cost Breakdown",
      noHistory: "No History Yet",
      noHistoryDesc: "Calculate and save your first bill for",
      toSeeTracking: "to see tracking here.",
      electricity: "Electricity",
      water: "Water",
      gas: "Gas",
      services: "Services",
      fixed: "Fixed",
      renameBill: "Rename Bill"
    },
    settings: {
      settingsFor: "Settings for:",
      language: "Interface Language",
      standardTariffs: "Standard Tariffs",
      standardTariffsDesc: "Manage standard utility rates.",
      meterReadings: "Meter Readings",
      meterReadingsDesc: "Current/Previous readings for standard utilities.",
      additionalServices: "Additional Services",
      additionalServicesDesc: "Add custom services (Internet, Security, etc).",
      waterRate: "Water Rate",
      waterSubFee: "Water Sub. Fee",
      gasRate: "Gas Rate",
      gasDistFee: "Gas Dist. Fee",
      serviceName: "Service Name",
      type: "Type",
      unit: "Unit",
      feeAmount: "Fee Amount",
      ratePrice: "Rate Price",
      startReading: "Start Reading",
      addService: "Add Service",
      saveSuccess: "Settings updated successfully!",
      saveError: "Failed to save settings.",
      saveButton: "Save All Settings",
      currentReading: "Current Reading",
      types: {
        fee: "Fixed Fee",
        rate: "Metered Rate"
      },
      placeholders: {
        serviceName: "Service Name",
        feeAmount: "Fee Amount",
        unit: "Unit",
        price: "Price",
        start: "Start",
        current: "Current"
      }
    },
    objectManager: {
      addNew: "Add New Property",
      name: "Property Name",
      description: "Description (Optional)",
      create: "Create Object",
      error: "Failed to create object",
      placeholderName: "e.g. Summer House, Office",
      placeholderDesc: "..."
    }
  },
  uk: {
    common: {
      loading: "Завантаження...",
      save: "Зберегти",
      cancel: "Скасувати",
      delete: "Видалити",
      edit: "Редагувати",
      add: "Додати",
      currency: "₴",
      units: {
        kwh: "кВт·год",
        m3: "м³",
        fixed: "фікс"
      }
    },
    auth: {
      welcomeBack: "З поверненням",
      createAccount: "Створити акаунт",
      email: "Електронна пошта",
      password: "Пароль",
      signIn: "Увійти",
      signUp: "Зареєструватися",
      noAccount: "Немає акаунту?",
      hasAccount: "Вже є акаунт?",
      signInAction: "Увійти",
      signUpAction: "Зареєструватися",
      forgotPassword: "Забули пароль?",
      resetPasswordTitle: "Скинути пароль",
      sendResetLink: "Надіслати інструкції",
      backToSignIn: "Назад до входу",
      resetDescription: "Введіть email, і ми надішлемо інструкції для скидання пароля.",
      resetSuccess: "Якщо акаунт існує, посилання надіслано.",
      errors: {
        invalid: "Невірний email або пароль",
        taken: "Помилка реєстрації. Email зайнятий.",
        generic: "Сталася помилка"
      }
    },
    layout: {
      calculator: "Калькулятор",
      history: "Історія",
      settings: "Налаштування",
      profile: "Профіль",
      signOut: "Вийти",
      addProperty: "Додати об'єкт",
      loggedIn: "Увійшов як",
      subtitle: "Розумний облік комунальних послуг"
    },
    calculator: {
      calculatingFor: "Розрахунок для:",
      newReadings: "Нові показники",
      bill: "Рахунок",
      electricity: "Електроенергія",
      water: "Вода",
      gas: "Газ",
      rate: "Тариф",
      prev: "Попер",
      current: "Поточні",
      usage: "Спожито",
      fixedFee: "Фікс",
      estimatedBill: "Орієнтовний рахунок",
      saveButton: "Зберегти рахунок",
      saveError: "Не вдалося зберегти рахунок.",
      loadError: "Не вдалося завантажити тарифи.",
      standardUtilities: "Комунальні послуги"
    },
    history: {
      historyFor: "Історія для:",
      costBreakdown: "Розподіл витрат",
      noHistory: "Історія порожня",
      noHistoryDesc: "Розрахуйте та збережіть перший рахунок для",
      toSeeTracking: "щоб побачити статистику.",
      electricity: "Електроенергія",
      water: "Вода",
      gas: "Газ",
      services: "Послуги",
      fixed: "Фіксовано",
      renameBill: "Перейменувати рахунок"
    },
    settings: {
      settingsFor: "Налаштування для:",
      language: "Мова інтерфейсу",
      standardTariffs: "Стандартні тарифи",
      standardTariffsDesc: "Керування тарифами на комунальні послуги.",
      meterReadings: "Показники лічильників",
      meterReadingsDesc: "Поточні/попередні показники для комунальних послуг.",
      additionalServices: "Додаткові послуги",
      additionalServicesDesc: "Додайте власні послуги (Інтернет, Охорона тощо).",
      waterRate: "Тариф на воду",
      waterSubFee: "Абонплата (Вода)",
      gasRate: "Тариф на газ",
      gasDistFee: "Доставка газу",
      serviceName: "Назва послуги",
      type: "Тип",
      unit: "Одиниця",
      feeAmount: "Сума плати",
      ratePrice: "Ціна за одиницю",
      startReading: "Початковий показник",
      addService: "Додати послугу",
      saveSuccess: "Налаштування успішно збережено!",
      saveError: "Не вдалося зберегти налаштування.",
      saveButton: "Зберегти всі налаштування",
      currentReading: "Поточний показник",
      types: {
        fee: "Фіксована плата",
        rate: "За лічильником"
      },
      placeholders: {
        serviceName: "Назва послуги",
        feeAmount: "Сума",
        unit: "Од.",
        price: "Ціна",
        start: "Старт",
        current: "Поточні"
      }
    },
    objectManager: {
      addNew: "Додати новий об'єкт",
      name: "Назва об'єкту",
      description: "Опис (необов'язково)",
      create: "Створити об'єкт",
      error: "Не вдалося створити об'єкт",
      placeholderName: "напр. Дача, Офіс",
      placeholderDesc: "..."
    }
  }
};

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.en;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('uk');

  const value = {
    language,
    setLanguage,
    t: translations[language]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};