import React from 'react';
import { useTranslation } from 'react-i18next';
import { twJoin } from 'tailwind-merge';

function Dashboard() {
  const { t } = useTranslation();

  return (
    <div className={twJoin(
      'pt-[86px] min-h-full w-full h-screen',
      'flex flex-row justify-center items-center')}
    >{t("dashboard.description")}</div>
  )
}

export default Dashboard;