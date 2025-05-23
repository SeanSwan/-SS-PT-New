// src/store/themeSlice.ts
import { createSlice } from "@reduxjs/toolkit";

// Define all possible theme modes
type ThemeMode = "dark" | "light" | "original";

interface ThemeState {
  mode: ThemeMode;
}

const initialState: ThemeState = {
  mode: "dark", // default theme
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setThemeMode: (state, action) => {
      state.mode = action.payload; // "dark", "light", or "original"
    },
  },
});

export const { setThemeMode } = themeSlice.actions;
export default themeSlice.reducer;
