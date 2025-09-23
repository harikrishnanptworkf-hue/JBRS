import React from "react";
import { useSelector } from "react-redux";
import { Routes, Route } from "react-router-dom";
import { layoutTypes } from "./constants/layout";

import {publicRoutes, authProtectedRoutes} from "./routes/allRoutes";

import HorizontalLayout from "./components/HorizontalLayout/";
import NonAuthLayout from "./components/NonAuthLayout";

import fakeBackend from "./helpers/AuthType/fakeBackend";
import AuthProtected from './routes/AuthProtected';

// Activating fake backend
fakeBackend();

const getLayout = (layoutType) => {
    return HorizontalLayout;
  };

const Index = () => {
    // Use a plain selector for extraction, not createSelector
    const layoutType = useSelector(state => state.Layout.layoutType);
    const Layout = getLayout(layoutType);
    return (
        <React.Fragment>
        <Routes>
            <Route>
                {publicRoutes.map((route, idx) => (
                    <Route
                        path={route.path}
                        element={
                            <NonAuthLayout>
                                {route.component}
                            </NonAuthLayout>
                        }
                        key={idx}
                        exact={true}
                    />
                ))}
            </Route>

            <Route>
                {authProtectedRoutes.map((route, idx) => (
                    <Route
                        path={route.path}
                        element={
                            <AuthProtected>
                                <Layout>{route.component}</Layout>
                            </AuthProtected>
                        }
                        key={idx}
                        exact={true}
                    />
                ))}
            </Route>
        </Routes>
    </React.Fragment>
    );
  };
  
  export default Index;