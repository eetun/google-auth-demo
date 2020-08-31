import React from "react";

interface Props {}

interface State {
  loading: boolean;
  googleLoginURL: string;
  googleData: any;
  events: any[];
}

export default class App extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      loading: true,
      googleLoginURL: "",
      googleData: undefined,
      events: [],
    };
  }

  componentDidMount = async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      try {
        const response = await fetch("http://localhost:8080/glogin", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
          }),
        });

        const googleData = await response.json();

        this.setState({
          googleData,
        });
      } catch (e) {
        console.log("Error", e);
      }
    }

    this.setState({
      loading: false,
      googleLoginURL: await this.getGoogleLoginURL(),
    });
  };

  getGoogleLoginURL = async () => {
    try {
      const response = await fetch("http://localhost:8080/gurl");
      return response.json();
    } catch (e) {
      console.log(e);
    }
  };

  fetchCalendarEvents = async () => {
    try {
      const response = await fetch("http://localhost:8080/events");
      const events = await response.json();
      this.setState({
        loading: false,
        events,
      });
    } catch (e) {
      console.log(e);
    }
  };

  render() {
    const { loading, googleLoginURL, googleData, events } = this.state;

    if (loading) {
      return null;
    }

    return (
      <div className="container">
        <h1>Google OAuth 2.0 demo</h1>
        {!googleData && (
          <a href={googleLoginURL} className="btn">
            Sign in with Google
          </a>
        )}

        {googleData && (
          <div className="data-container">
            <pre>{JSON.stringify(googleData, null, 2)}</pre>
          </div>
        )}
        {}

        {googleData && !events.length && (
          <button className="btn" onClick={this.fetchCalendarEvents}>
            Fetch events
          </button>
        )}

        {events && (
          <ul>
            {events.map((event) => (
              <li key={event.id}>
                <span>{new Date(event.start.dateTime).toLocaleString()}</span>
                {event.summary}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
}
