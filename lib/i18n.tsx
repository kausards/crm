import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'bn';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  toggleLanguage: () => {},
  t: (key: string) => key,
});

const translations: Record<string, Record<Language, string>> = {
  // Navigation & General
  'Dashboard': { en: 'Dashboard', bn: 'ড্যাশবোর্ড' },
  'Orders': { en: 'Orders', bn: 'অর্ডারসমূহ' },
  'New Order': { en: 'New Order', bn: 'নতুন অর্ডার' },
  'Products': { en: 'Products', bn: 'পণ্য' },
  'Customers': { en: 'Customers', bn: 'কাস্টমার' },
  'Courier Tracker': { en: 'Courier Tracker', bn: 'কুরিয়ার ট্র্যাকার' },
  'Finance': { en: 'Finance', bn: 'অর্থনীতি' },
  'Payroll': { en: 'Payroll', bn: 'বেতন' },
  'Due & Loan': { en: 'Due & Loan', bn: 'বকেয়া ও ঋণ' },
  'Settings': { en: 'Settings', bn: 'সেটিংস' },
  'Website & Store': { en: 'Website & Store', bn: 'ওয়েবসাইট ও স্টোর' },
  'Search...': { en: 'Search...', bn: 'খুঁজুন...' },
  'Search by ID or customer...': { en: 'Search by ID or customer...', bn: 'আইডি বা কাস্টমার দিয়ে খুঁজুন...' },
  'Export': { en: 'Export', bn: 'এক্সপোর্ট' },
  'Live': { en: 'Live', bn: 'লাইভ' },
  
  // Orders Page Tabs & Table Headers
  'All': { en: 'All', bn: 'সব' },
  'Pending': { en: 'Pending', bn: 'অপেক্ষমান' },
  'Confirmed': { en: 'Confirmed', bn: 'কনফার্মড' },
  'In Transit': { en: 'In Transit', bn: 'পথে আছে' },
  'Delivered': { en: 'Delivered', bn: 'ডেলিভারড' },
  
  'Order Info': { en: 'Order Info', bn: 'অর্ডার ইনফো' },
  'Customer': { en: 'Customer', bn: 'কাস্টমার' },
  'History': { en: 'History', bn: 'হিস্ট্রি' },
  'Address': { en: 'Address', bn: 'ঠিকানা' },
  'Product': { en: 'Product', bn: 'প্রোডাক্ট' },
  'QTY': { en: 'QTY', bn: 'পরিমাণ' },
  'Amount': { en: 'Amount', bn: 'টাকা' },
  'Status': { en: 'Status', bn: 'স্ট্যাটাস' },
  'Actions': { en: 'Actions', bn: 'অ্যাকশন' },
  
  // Table row elements
  'Call': { en: 'Call', bn: 'কল' },
  
  // Statuses
  'On Hold': { en: 'On Hold', bn: 'অন হোল্ড' },
  'Call Not Received': { en: 'Call Not Received', bn: 'কল রিসিভ করেনি' },
  'Cancelled': { en: 'Cancelled', bn: 'বাতিল' },
  'Send to Courier': { en: 'Send to Courier', bn: 'কুরিয়ারে পাঠান' },
  
  // Modals
  'Cancel': { en: 'Cancel', bn: 'বাতিল করুন' },
  'Save Status': { en: 'Save Status', bn: 'সেভ করুন' },
  'Status Note Required': { en: 'Status Note Required', bn: 'স্ট্যাটাস নোট প্রয়োজন' },
  'Type your note here...': { en: 'Type your note here...', bn: 'এখানে আপনার নোট লিখুন...' },
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('nexus-font-lang') as Language;
    if (saved === 'bn') {
      setLanguage('bn');
      document.body.classList.add('font-bengali');
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'bn' : 'en';
    setLanguage(newLang);
    localStorage.setItem('nexus-font-lang', newLang);
    if (newLang === 'bn') {
      document.body.classList.add('font-bengali');
    } else {
      document.body.classList.remove('font-bengali');
    }
  };

  const t = (key: string): string => {
    if (!translations[key]) return key;
    return translations[key][language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
