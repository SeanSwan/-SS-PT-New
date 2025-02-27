// Example: BerryAdmin/layout/Header/ThemeToggle.tsx
import React from "react";
import { useDispatch } from "react-redux";
import { setThemeMode } from "@/store/themeSlice";

const ThemeToggle = () => {
  const dispatch = useDispatch();

  const handleChangeTheme = (mode: "dark" | "light" | "original") => {
    dispatch(setThemeMode(mode));
  };

  return (
    <div>
      <button onClick={() => handleChangeTheme("dark")}>Dark</button>
      <button onClick={() => handleChangeTheme("light")}>Light</button>
      <button onClick={() => handleChangeTheme("original")}>Original</button>
    </div>
  );
};

export default ThemeToggle;
