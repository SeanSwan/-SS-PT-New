// src/store/menuSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface MenuState {
  isDashboardDrawerOpened: boolean;
  openedMenuItems: string[];
}

const initialState: MenuState = {
  isDashboardDrawerOpened: true,
  openedMenuItems: []
};

const menuSlice = createSlice({
  name: "menu",
  initialState,
  reducers: {
    setDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.isDashboardDrawerOpened = action.payload;
    },
    toggleMenuItem: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.openedMenuItems.includes(id)) {
        state.openedMenuItems = state.openedMenuItems.filter(item => item !== id);
      } else {
        state.openedMenuItems.push(id);
      }
    }
  },
});

export const { setDrawerOpen, toggleMenuItem } = menuSlice.actions;
export default menuSlice.reducer;