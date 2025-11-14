# Page snapshot

```yaml
- generic [ref=e5]:
    - img [ref=e7]
    - heading "Something went wrong" [level=2] [ref=e9]
    - paragraph [ref=e10]: An error occurred in the landing page feature. Don't worry, your data is safe.
    - alert [ref=e11]:
        - paragraph [ref=e12]: 'Error details:'
        - paragraph [ref=e13]: "Failed to execute 'btoa' on 'Window': The string to be encoded contains characters outside of the Latin1 range."
    - generic [ref=e14]:
        - button "Try Again" [ref=e15] [cursor=pointer]:
            - img [ref=e16] [cursor=pointer]
            - text: Try Again
        - button "Go Home" [ref=e21] [cursor=pointer]:
            - img [ref=e22] [cursor=pointer]
            - text: Go Home
    - paragraph [ref=e25]: If this problem persists, please contact support.
```
