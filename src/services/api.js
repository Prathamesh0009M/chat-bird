import axios from 'axios';
export const axiosInstance = axios.create({});

const API_URL = 'https://chat-bird-backend.onrender.com/api'; // Change this to your backend URL

const apiConnector = (method, url, bodyData, headers, params) => {
  return axiosInstance({
    method: `${method}`,
    url: `${url}`,
    data: bodyData ? bodyData : null,
    headers: headers ? headers : null,
    params: params ? params : null,
  })
}


export async function signupUser(name, email, password, preferredLanguage) {
  try {
    const response = await apiConnector(
      'post',
      `${API_URL}/auth/signup`,
      { name, email, password, preferredLanguage },
      { 'Content-Type': 'application/json' }
    );

    if (!response?.data?.success) {
      console.error("Signup failed:", response?.data?.message);
      return null;
    }

    return response.data; // return actual data
  } catch (e) {
    console.error("Signup error:", e);
    return null;
  }
}


export async function loginUser(email, password) {
  // const toastId = toast.loading("Loading...");
  // setLoading(true);

  // dispatch(setloading(true));
  try {
    const response = await apiConnector("POST", `${API_URL}/auth/login`, {
      email,
      password,
    });

    console.log("token is : -", response);
    if (!response.data.success) {
      throw new Error(response.data.message);
    }
    // dispatch(setToken(response.data.token));

    console.log("Login successfully");
    // const userImage = response.data?.user?.image
    //     ? response.data.user.image
    //     : `https://api.dicebear.com/5.x/initials/svg?seed=${response.data.user.firstName} ${response.data.user.lastName}`;

    // console.log("response.............", response);

    // dispatch(setUsers({ ...response.data.user, image: userImage }));
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("user", JSON.stringify(response.data.user));


    // Reload the page before navigating


    // *****************after it remove this *********************************
    // window.location.reload();  // Forces the page to reload completely
    return response;

  } catch (e) {
    console.log("login error............!", e);
    toast.error("Login failed Try Again");
  }
  // dispatch(setloading(false));
  // toast.dismiss(toastId);

};


export function logout(navigate) {
  return (dispatch) => {

    // Perform logout operations
    // dispatch(setToken(null));
    // dispatch(setUsers(null));
    // Optional: dispatch(resetCart());

    localStorage.removeItem("token");
    localStorage.removeItem("users");
    // Navigate after logout

    navigate("/");

  };
}


export async function fetchAllUsers(token) {
  try {
    const response = await apiConnector(
      "GET",
      `${API_URL}/chats/getAllUser`,
      token ? null : null,
      {
        Authorization: `Bearer ${token}`,
      },
      { withCredentials: true } // Add this to send cookies

    );
    if (!response.data.success) {
      throw new Error(response.data.message);
    }
    return response;
  } catch (e) {
    console.error("Fetch all users error:", e);
  }
}
